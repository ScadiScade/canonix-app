import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/ai/credits — get user's AI credit balance
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let credit = await prisma.aiCredit.findUnique({ where: { userId: session.user.id } });
  if (!credit) {
    credit = await prisma.aiCredit.create({ data: { userId: session.user.id } });
  }

  return NextResponse.json({ balance: credit.balance, totalUsed: credit.totalUsed, totalBought: credit.totalBought });
}
