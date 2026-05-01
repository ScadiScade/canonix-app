import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateBody, buyCreditsSchema } from "@/lib/validators";

const CREDIT_PACKS: Record<string, { credits: number; price: number }> = {
  small: { credits: 50, price: 14900 },   // 149₽ in kopecks
  medium: { credits: 200, price: 49000 },  // 490₽ in kopecks
  large: { credits: 500, price: 99000 },   // 990₽ in kopecks
};

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
  const pack = CREDIT_PACKS[packId];
  if (!pack) {
    return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    // Dev mode: pay from wallet
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

  // TODO: Integrate Stripe checkout for credit packs
  return NextResponse.json({ error: "Stripe integration pending" }, { status: 501 });
}
