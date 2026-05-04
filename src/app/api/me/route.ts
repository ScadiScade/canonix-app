import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Apply pending plan change if current period has ended
async function applyPendingIfExpired(sub: { id: string; plan: string; pendingPlan: string | null; currentPeriodEnd: Date | null; status: string } | null) {
  if (!sub || !sub.pendingPlan || !sub.currentPeriodEnd || new Date(sub.currentPeriodEnd) > new Date()) return sub;

  const newPlan = sub.pendingPlan;
  const updated = await prisma.$transaction(async (tx) => {
    const s = await tx.subscription.update({
      where: { id: sub.id },
      data: {
        plan: newPlan,
        status: "active",
        pendingPlan: null,
        currentPeriodEnd: newPlan === "free" ? null : sub.currentPeriodEnd,
      },
    });

    // Cleanup team if corporate subscription cancelled to free
    if (newPlan === "free" && sub.plan === "corporate") {
      const team = await tx.team.findUnique({ where: { subscriptionId: sub.id } });
      if (team) {
        await tx.teamMember.deleteMany({ where: { teamId: team.id } });
        await tx.teamInvitation.deleteMany({ where: { teamId: team.id } });
        await tx.team.delete({ where: { id: team.id } });
      }
    }

    return s;
  });

  return updated;
}

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

  // Lazy: apply pending change if period ended
  const sub = await applyPendingIfExpired(subscription);

  return NextResponse.json({
    profile: user,
    credits: credit ? { balance: credit.balance, totalUsed: credit.totalUsed, totalBought: credit.totalBought } : null,
    subscription: sub ? { plan: sub.plan, status: sub.status, currentPeriodEnd: sub.currentPeriodEnd, pendingPlan: sub.pendingPlan } : null,
  });
}
