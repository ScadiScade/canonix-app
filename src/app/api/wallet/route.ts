import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateBody, walletTopupSchema } from "@/lib/validators";

// GET /api/wallet — get wallet balance + recent transactions
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let wallet = await prisma.wallet.findUnique({
    where: { userId: session.user.id },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: { userId: session.user.id },
      include: { transactions: true },
    });
  }

  return NextResponse.json({
    balance: wallet.balance,       // kopecks
    frozen: wallet.frozen,         // kopecks
    available: wallet.balance - wallet.frozen,
    transactions: wallet.transactions.map(tx => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      balanceAfter: tx.balanceAfter,
      description: tx.description,
      refId: tx.refId,
      createdAt: tx.createdAt,
    })),
  });
}

// POST /api/wallet — top up wallet (dev mode: direct add; prod: payment gateway redirect)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = validateBody(walletTopupSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { amount } = parsed.data; // amount in rubles

  if (amount < 100 || amount > 50000) {
    return NextResponse.json({ error: "Amount must be between 100 and 50000 rubles" }, { status: 400 });
  }

  const amountKopecks = amount * 100;

  // Atomic top-up inside transaction to prevent race conditions
  const result = await prisma.$transaction(async (tx) => {
    let wallet = await tx.wallet.findUnique({ where: { userId: session.user.id } });
    if (!wallet) {
      wallet = await tx.wallet.create({ data: { userId: session.user.id } });
    }

    const newBalance = wallet.balance + amountKopecks;

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "topup",
        amount: amountKopecks,
        balanceAfter: newBalance,
        description: `Пополнение ${amount} ₽`,
      },
    });

    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: newBalance },
    });

    return { balance: newBalance, available: newBalance - wallet.frozen };
  });

  return NextResponse.json(result);
}
