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
  });
}

// PUT /api/subscription — update plan (for dev without Stripe)
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = validateBody(updateSubscriptionSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { plan } = parsed.data;

  const creditBonuses: Record<string, number> = { free: 0, pro: 200, corporate: 1000 };

  let sub = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
  if (!sub) {
    sub = await prisma.subscription.create({
      data: { userId: session.user.id, plan, status: "active" },
    });
  } else {
    sub = await prisma.subscription.update({
      where: { id: sub.id },
      data: { plan, status: "active" },
    });
  }

  // Add monthly credits for paid plans
  if (creditBonuses[plan] > 0) {
    await prisma.aiCredit.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, balance: creditBonuses[plan] },
      update: { balance: { increment: creditBonuses[plan] }, totalBought: { increment: creditBonuses[plan] } },
    });
  }

  return NextResponse.json({ plan: sub.plan, status: sub.status });
}
