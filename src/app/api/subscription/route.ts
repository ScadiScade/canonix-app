import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateBody, updateSubscriptionSchema } from "@/lib/validators";

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

  return NextResponse.json({
    plan: sub.plan,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd,
    pendingPlan: sub.pendingPlan,
  });
}

// PUT /api/subscription — update plan (downgrade/cancel)
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

  // Downgrade or cancel: schedule for end of period
  if (newTier < currentTier || plan === "free") {
    if (sub.plan === "free") {
      return NextResponse.json({ plan: sub.plan, status: sub.status, message: "Already on free plan" });
    }
    sub = await prisma.subscription.update({
      where: { id: sub.id },
      data: { pendingPlan: plan, status: "cancelling" },
    });
    return NextResponse.json({
      plan: sub.plan,
      pendingPlan: sub.pendingPlan,
      status: sub.status,
      message: plan === "free" ? "Subscription will be cancelled at end of period" : `Downgrade to ${plan} scheduled`,
    });
  }

  // Same tier — no change
  if (newTier === currentTier) {
    return NextResponse.json({ plan: sub.plan, status: sub.status, message: "No change" });
  }

  // Upgrade should go through checkout, not here
  return NextResponse.json({ error: "Use /api/subscription/checkout for upgrades" }, { status: 400 });
}
