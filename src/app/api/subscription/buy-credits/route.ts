import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateBody, buyCreditsSchema } from "@/lib/validators";

const CREDIT_PACKS: Record<string, { credits: number; price: number }> = {
  small: { credits: 50, price: 149 },
  medium: { credits: 200, price: 499 },
  large: { credits: 500, price: 999 },
};

// POST /api/subscription/buy-credits — purchase credit pack
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = validateBody(buyCreditsSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { packId } = parsed.data;
  const pack = CREDIT_PACKS[packId];
  if (!pack) {
    return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    // Dev mode: directly add credits without Stripe
    const credit = await prisma.aiCredit.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, balance: pack.credits, totalBought: pack.credits },
      update: { balance: { increment: pack.credits }, totalBought: { increment: pack.credits } },
    });

    return NextResponse.json({ balance: credit.balance, creditsAdded: pack.credits });
  }

  // TODO: Integrate Stripe checkout for credit packs
  return NextResponse.json({ error: "Stripe integration pending" }, { status: 501 });
}
