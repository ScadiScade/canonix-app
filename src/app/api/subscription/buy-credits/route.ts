import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateBody, buyCreditsSchema } from "@/lib/validators";

// Fallback if DB has no pricing config yet
const FALLBACK_PACKS: Record<string, { credits: number; price: number }> = {
  small: { credits: 50, price: 14900 },
  medium: { credits: 200, price: 49000 },
  large: { credits: 500, price: 99000 },
};

async function getCreditPacks(): Promise<Record<string, { credits: number; price: number }>> {
  const configs = await prisma.pricingConfig.findMany({ where: { type: "creditPack", active: true } });
  if (configs.length === 0) return FALLBACK_PACKS;
  const map: Record<string, { credits: number; price: number }> = {};
  for (const c of configs) {
    map[c.key] = { credits: c.credits, price: c.price };
  }
  return map;
}

// POST /api/subscription/buy-credits — purchase credit pack via wallet
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = validateBody(buyCreditsSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { packId } = parsed.data;
  const packs = await getCreditPacks();
  const pack = packs[packId];
  if (!pack) {
    return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
  }

  // Always try wallet payment first
  let wallet = await prisma.wallet.findUnique({ where: { userId: session.user.id } });
  if (!wallet) {
    wallet = await prisma.wallet.create({ data: { userId: session.user.id } });
  }

  const available = wallet.balance - wallet.frozen;
  if (available < pack.price) {
    return NextResponse.json({
      error: "Insufficient wallet balance",
      required: pack.price,
      available,
      deficit: pack.price - available,
    }, { status: 402 });
  }

  // Deduct from wallet
  const newBalance = wallet.balance - pack.price;
  await prisma.wallet.update({
    where: { id: wallet.id },
    data: { balance: newBalance },
  });
  await prisma.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: "credits",
      amount: -pack.price,
      balanceAfter: newBalance,
      description: `${pack.credits} AI кредитов`,
      refId: packId,
    },
  });

  // Add credits
  const credit = await prisma.aiCredit.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, balance: pack.credits, totalBought: pack.credits },
    update: { balance: { increment: pack.credits }, totalBought: { increment: pack.credits } },
  });

  return NextResponse.json({ balance: credit.balance, creditsAdded: pack.credits, walletBalance: newBalance });
}
