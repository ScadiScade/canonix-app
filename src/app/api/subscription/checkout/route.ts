import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateBody, checkoutSchema } from "@/lib/validators";

// Fallback if DB has no pricing config yet
const FALLBACK_PLAN_PRICES: Record<string, number> = { pro: 29900, corporate: 99900 };
const FALLBACK_CREDIT_BONUSES: Record<string, number> = { pro: 200, corporate: 800 };

async function getPlanPrices(): Promise<Record<string, number>> {
  const configs = await prisma.pricingConfig.findMany({ where: { type: "plan", active: true } });
  if (configs.length === 0) return FALLBACK_PLAN_PRICES;
  const map: Record<string, number> = {};
  for (const c of configs) map[c.key] = c.price;
  return map;
}

async function getPlanCredits(): Promise<Record<string, number>> {
  const configs = await prisma.pricingConfig.findMany({ where: { type: "plan", active: true } });
  if (configs.length === 0) return FALLBACK_CREDIT_BONUSES;
  const map: Record<string, number> = {};
  for (const c of configs) map[c.key] = c.credits;
  return map;
}

// POST /api/subscription/checkout — subscribe via wallet or Stripe
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = validateBody(checkoutSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { planId } = parsed.data;

  const PLAN_PRICES = await getPlanPrices();
  const CREDIT_BONUSES = await getPlanCredits();

  const priceKopecks = PLAN_PRICES[planId] ?? 0;
  if (priceKopecks === 0) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // Check if user has Pro and is upgrading to Corporate — apply upgrade pricing
  const existingSub = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
  let finalPrice = priceKopecks;
  if (existingSub?.plan === "pro" && planId === "corporate") {
    finalPrice = priceKopecks - PLAN_PRICES.pro + 4900; // 99900 - 29900 + 4900 = 74900
  }

  // Always try wallet payment first
  let wallet = await prisma.wallet.findUnique({ where: { userId: session.user.id } });
  if (!wallet) {
    wallet = await prisma.wallet.create({ data: { userId: session.user.id } });
  }

  const available = wallet.balance - wallet.frozen;
  if (available < finalPrice) {
    return NextResponse.json({
      error: "Insufficient wallet balance",
      required: finalPrice,
      available,
      deficit: finalPrice - available,
    }, { status: 402 });
  }

  // Atomic deduction with balance guard
  const result = await prisma.$transaction(async (tx) => {
    const w = await tx.wallet.findUnique({ where: { id: wallet.id } });
    if (!w) throw new Error("Wallet not found");
    const newBal = w.balance - finalPrice;
    if (newBal < 0) throw new Error("Balance would go negative");

    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBal } });
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id, type: "subscription", amount: -finalPrice, balanceAfter: newBal,
        description: `Подписка ${planId === "pro" ? "Pro" : "Корпоративная"}`, refId: planId,
      },
    });

    let sub = existingSub;
    if (!sub) {
      sub = await tx.subscription.create({
        data: {
          userId: session.user.id, plan: planId, status: "active",
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    } else {
      sub = await tx.subscription.update({
        where: { id: sub.id },
        data: { plan: planId, status: "active", currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), pendingPlan: null },
      });
    }

    if (CREDIT_BONUSES[planId] > 0) {
      await tx.aiCredit.upsert({
        where: { userId: session.user.id },
        create: { userId: session.user.id, balance: CREDIT_BONUSES[planId] },
        update: { balance: { increment: CREDIT_BONUSES[planId] }, totalBought: { increment: CREDIT_BONUSES[planId] } },
      });
    }

    if (planId === "corporate") {
      const existingTeam = await tx.team.findUnique({ where: { subscriptionId: sub.id } });
      if (!existingTeam) {
        const userName = session.user.name || session.user.email?.split("@")[0] || "Team";
        const teamSlug = `${userName.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "-").slice(0, 20)}-team`;
        await tx.team.create({
          data: {
            name: `Команда ${userName}`, slug: teamSlug, ownerId: session.user.id, subscriptionId: sub.id,
            members: { create: { userId: session.user.id, role: "admin" } },
          },
        });
      }
    }

    return { plan: sub.plan, status: sub.status, walletBalance: newBal };
  });

  return NextResponse.json(result);
}
