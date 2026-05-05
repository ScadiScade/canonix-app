import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const typeFilter = searchParams.get("type") || undefined;
  const cursor = searchParams.get("cursor") || undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  const wallet = await prisma.wallet.findUnique({ where: { userId: session.user.id } });
  if (!wallet) {
    return NextResponse.json({ transactions: [], hasMore: false });
  }

  const where: Record<string, unknown> = { walletId: wallet.id };
  if (typeFilter) where.type = typeFilter;

  const transactions = await prisma.walletTransaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = transactions.length > limit;
  const items = hasMore ? transactions.slice(0, -1) : transactions;

  return NextResponse.json({
    transactions: items.map(tx => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      balanceAfter: tx.balanceAfter,
      description: tx.description,
      refId: tx.refId,
      createdAt: tx.createdAt,
    })),
    hasMore,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
}
