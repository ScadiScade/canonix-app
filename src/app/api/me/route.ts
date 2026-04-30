import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/me — batch user data (profile + credits + subscription) in one call
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user, credit, subscription] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true, name: true, bio: true, email: true, image: true,
        createdAt: true, _count: { select: { universes: true } },
      },
    }),
    prisma.aiCredit.findUnique({ where: { userId: session.user.id } }),
    prisma.subscription.findUnique({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({
    profile: user,
    credits: credit ? { balance: credit.balance, totalUsed: credit.totalUsed, totalBought: credit.totalBought } : null,
    subscription: subscription ? { plan: subscription.plan, status: subscription.status } : null,
  });
}
