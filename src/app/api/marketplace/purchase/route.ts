import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/marketplace/purchase — buy a paid universe
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { universeId } = await req.json();
  if (!universeId || typeof universeId !== "string") {
    return NextResponse.json({ error: "universeId required" }, { status: 400 });
  }

  const universe = await prisma.universe.findUnique({
    where: { id: universeId },
    select: { id: true, slug: true, name: true, license: true, price: true, userId: true },
  });

  if (!universe || universe.license !== "paid") {
    return NextResponse.json({ error: "Universe not available for purchase" }, { status: 400 });
  }

  // Check if already purchased
  const existingPurchase = await prisma.universePurchase.findFirst({
    where: { universeId, buyerId: session.user.id },
  });
  if (existingPurchase) {
    return NextResponse.json({ error: "Already purchased", slug: universe.slug }, { status: 409 });
  }

  const priceKopecks = universe.price || 0;
  if (priceKopecks === 0) {
    return NextResponse.json({ error: "Invalid price" }, { status: 400 });
  }

  // Check wallet balance
  let wallet = await prisma.wallet.findUnique({ where: { userId: session.user.id } });
  if (!wallet) {
    wallet = await prisma.wallet.create({ data: { userId: session.user.id } });
  }

  const available = wallet.balance - wallet.frozen;
  if (available < priceKopecks) {
    return NextResponse.json({
      error: "Insufficient wallet balance",
      deficit: priceKopecks - available,
    }, { status: 402 });
  }

  // Atomic purchase
  const result = await prisma.$transaction(async (tx) => {
    const w = await tx.wallet.findUnique({ where: { id: wallet!.id } });
    if (!w) throw new Error("Wallet not found");
    const newBal = w.balance - priceKopecks;
    if (newBal < 0) throw new Error("Balance would go negative");

    await tx.wallet.update({ where: { id: wallet!.id }, data: { balance: newBal } });
    await tx.walletTransaction.create({
      data: {
        walletId: wallet!.id,
        type: "purchase",
        amount: -priceKopecks,
        balanceAfter: newBal,
        description: `Покупка вселенной «${universe.name}»`,
        refId: universeId,
      },
    });

    // Credit seller's wallet
    const sellerWallet = await tx.wallet.findUnique({ where: { userId: universe.userId } });
    if (sellerWallet) {
      const commission = Math.round(priceKopecks * 0.20); // 20% commission
      const payout = priceKopecks - commission;
      const sellerNewBal = sellerWallet.balance + payout;
      await tx.wallet.update({ where: { id: sellerWallet.id }, data: { balance: sellerNewBal } });
      await tx.walletTransaction.create({
        data: {
          walletId: sellerWallet.id,
          type: "payout",
          amount: payout,
          balanceAfter: sellerNewBal,
          description: `Продажа вселенной «${universe.name}»`,
          refId: universeId,
        },
      });
    }

    const commission = Math.round(priceKopecks * 0.20);
    const purchase = await tx.universePurchase.create({
      data: { universeId, buyerId: session.user.id, price: priceKopecks, commission },
    });

    return { purchaseId: purchase.id, slug: universe.slug };
  });

  return NextResponse.json(result, { status: 201 });
}
