import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateBody, updateSubscriptionSchema } from "@/lib/validators";
import type { Subscription } from "@prisma/client";

// Apply pending plan change if current period has ended
async function applyPendingIfExpired(sub: Subscription): Promise<Subscription> {
  if (!sub.pendingPlan || !sub.currentPeriodEnd || new Date(sub.currentPeriodEnd) > new Date()) return sub;

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

// GET /api/subscription — get current subscription
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let sub = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
  if (!sub) {
    sub = await prisma.subscription.create({ data: { userId: session.user.id, plan: "free" } });
  }

  // Lazy: apply pending change if period ended
  sub = await applyPendingIfExpired(sub);

  return NextResponse.json({
    plan: sub.plan,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd,
    pendingPlan: sub.pendingPlan,
  });
}

// PUT /api/subscription — downgrade, cancel, or reactivate
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = validateBody(updateSubscriptionSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { plan } = parsed.data;

  let sub = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
  if (!sub) {
    sub = await prisma.subscription.create({
      data: { userId: session.user.id, plan: "free", status: "active" },
    });
  }

  const tierOrder: Record<string, number> = { free: 0, pro: 1, corporate: 2 };
  const currentTier = tierOrder[sub.plan] ?? 0;
  const newTier = tierOrder[plan] ?? 0;

  // Reactivate: undo pending cancellation/downgrade
  if (plan === sub.plan && sub.pendingPlan) {
    sub = await prisma.subscription.update({
      where: { id: sub.id },
      data: { pendingPlan: null, status: "active" },
    });
    return NextResponse.json({
      plan: sub.plan,
      pendingPlan: sub.pendingPlan,
      status: sub.status,
      message: "Subscription reactivated",
    });
  }

  // Same tier, no pending — nothing to do
  if (newTier === currentTier && !sub.pendingPlan) {
    return NextResponse.json({ plan: sub.plan, status: sub.status, message: "No change" });
  }

  // Upgrade — must go through checkout for payment
  if (newTier > currentTier) {
    return NextResponse.json({ error: "Use /api/subscription/checkout for upgrades" }, { status: 400 });
  }

  // Downgrade or cancel: schedule for end of current period
  // (newTier < currentTier): downgrade to lower paid plan or cancel to free
  sub = await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      pendingPlan: plan,
      status: plan === "free" ? "cancelling" : "downgrading",
    },
  });
  return NextResponse.json({
    plan: sub.plan,
    pendingPlan: sub.pendingPlan,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd,
    message: plan === "free"
      ? "Subscription will be cancelled at end of period"
      : `Plan will change to ${plan} at end of period`,
  });
}
