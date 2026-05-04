import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/cron/subscriptions — apply pending plan changes for expired periods
// Called by external cron (e.g. every hour) with a secret token
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = { cancelled: 0, downgraded: 0, errors: 0 };

  // Find all subscriptions with a pending plan whose current period has ended
  const subs = await prisma.subscription.findMany({
    where: {
      pendingPlan: { not: null },
      currentPeriodEnd: { lte: now },
      status: { in: ["cancelling", "downgrading"] },
    },
  });

  for (const sub of subs) {
    try {
      const newPlan = sub.pendingPlan!;

      await prisma.$transaction(async (tx) => {
        // Apply the plan change
        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            plan: newPlan,
            status: "active",
            pendingPlan: null,
            // If switching to free, clear the period end
            currentPeriodEnd: newPlan === "free" ? null : sub.currentPeriodEnd,
          },
        });

        // If cancelled to free, handle team cleanup for corporate plans
        if (newPlan === "free" && sub.plan === "corporate") {
          // Delete team members and team associated with this subscription
          const team = await tx.team.findUnique({ where: { subscriptionId: sub.id } });
          if (team) {
            await tx.teamMember.deleteMany({ where: { teamId: team.id } });
            await tx.teamInvitation.deleteMany({ where: { teamId: team.id } });
            await tx.team.delete({ where: { id: team.id } });
          }
        }
      });

      if (newPlan === "free") results.cancelled++;
      else results.downgraded++;
    } catch (e) {
      console.error(`Failed to apply pending plan for subscription ${sub.id}:`, e);
      results.errors++;
    }
  }

  return NextResponse.json({ processed: subs.length, ...results });
}
