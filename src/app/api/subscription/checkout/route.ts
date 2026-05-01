import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateBody, checkoutSchema } from "@/lib/validators";

const PLAN_PRICES: Record<string, number> = { pro: 29900, corporate: 99900 }; // kopecks
const CREDIT_BONUSES: Record<string, number> = { pro: 200, corporate: 800 };

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

  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    // Dev mode: pay from wallet balance
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

    // Deduct from wallet
    const newBalance = wallet.balance - finalPrice;
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: newBalance },
    });
    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "subscription",
        amount: -finalPrice,
        balanceAfter: newBalance,
        description: `Подписка ${planId === "pro" ? "Pro" : "Корпоративная"}`,
        refId: planId,
      },
    });

    // Update subscription
    let sub = existingSub;
    if (!sub) {
      sub = await prisma.subscription.create({
        data: {
          userId: session.user.id,
          plan: planId,
          status: "active",
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    } else {
      sub = await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          plan: planId,
          status: "active",
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          pendingPlan: null,
        },
      });
    }

    // Add monthly credits
    if (CREDIT_BONUSES[planId] > 0) {
      await prisma.aiCredit.upsert({
        where: { userId: session.user.id },
        create: { userId: session.user.id, balance: CREDIT_BONUSES[planId] },
        update: { balance: { increment: CREDIT_BONUSES[planId] }, totalBought: { increment: CREDIT_BONUSES[planId] } },
      });
    }

    // Auto-create team for corporate plan
    if (planId === "corporate") {
      const existingTeam = await prisma.team.findUnique({ where: { subscriptionId: sub.id } });
      if (!existingTeam) {
        const userName = session.user.name || session.user.email?.split("@")[0] || "Team";
        const teamSlug = `${userName.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "-").slice(0, 20)}-team`;
        await prisma.team.create({
          data: {
            name: `Команда ${userName}`,
            slug: teamSlug,
            ownerId: session.user.id,
            subscriptionId: sub.id,
            members: { create: { userId: session.user.id, role: "admin" } },
          },
        });
      }
    }

    return NextResponse.json({ plan: sub.plan, status: sub.status, walletBalance: newBalance });
  }

  // TODO: Production Stripe checkout
  return NextResponse.json({ error: "Stripe integration pending" }, { status: 501 });
}
