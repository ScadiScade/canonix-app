import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateBody, checkoutSchema } from "@/lib/validators";

// POST /api/subscription/checkout — create Stripe checkout session (placeholder)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = validateBody(checkoutSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { planId } = parsed.data;

  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    // Dev mode: directly update the plan without Stripe
    const creditBonuses: Record<string, number> = { pro: 200, corporate: 1000 };

    let sub = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
    if (!sub) {
      sub = await prisma.subscription.create({
        data: { userId: session.user.id, plan: planId, status: "active" },
      });
    } else {
      sub = await prisma.subscription.update({
        where: { id: sub.id },
        data: { plan: planId, status: "active" },
      });
    }

    if (creditBonuses[planId] > 0) {
      await prisma.aiCredit.upsert({
        where: { userId: session.user.id },
        create: { userId: session.user.id, balance: creditBonuses[planId] },
        update: { balance: { increment: creditBonuses[planId] }, totalBought: { increment: creditBonuses[planId] } },
      });
    }

    // Auto-create team for corporate plan
    if (planId === "corporate") {
      const existingTeam = await prisma.team.findUnique({ where: { subscriptionId: sub.id } });
      if (!existingTeam) {
        const userName = session.user.name || session.user.email?.split("@")[0] || "Team";
        const teamSlug = `${userName.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "-").slice(0, 20)}-team`;
        await prisma.team.create({
          data: {
            name: `Команда ${userName}`,
            slug: teamSlug,
            ownerId: session.user.id,
            subscriptionId: sub.id,
            members: { create: { userId: session.user.id, role: "admin" } },
          },
        });
      }
    }

    return NextResponse.json({ plan: sub.plan, status: sub.status });
  }

  // TODO: Integrate Stripe checkout when STRIPE_SECRET_KEY is set
  // const stripe = require('stripe')(stripeKey);
  // const session = await stripe.checkout.sessions.create({...});

  return NextResponse.json({ error: "Stripe integration pending" }, { status: 501 });
}
