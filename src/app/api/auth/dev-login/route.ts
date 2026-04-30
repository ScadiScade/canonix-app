import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/auth/dev-login — dev access code login (bypasses email verification)
// DISABLED in production for security
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Dev login is disabled in production" }, { status: 403 });
  }

  const { code } = await req.json();
  const devCode = process.env.DEV_ACCESS_CODE;

  if (!devCode || code !== devCode) {
    return NextResponse.json({ error: "Неверный код" }, { status: 401 });
  }

  // Find or create dev user
  let devUser = await prisma.user.findUnique({ where: { email: "dev@canonix.local" } });
  if (!devUser) {
    devUser = await prisma.user.create({
      data: {
        email: "dev@canonix.local",
        name: "Dev",
        emailVerified: new Date(),
      },
    });
  }

  // Ensure dev user has eternal corporate subscription, high credits, and team
  const existingCredit = await prisma.aiCredit.findUnique({ where: { userId: devUser.id } });
  if (!existingCredit) {
    await prisma.aiCredit.create({ data: { userId: devUser.id, balance: 99999 } });
  } else if (existingCredit.balance < 1000) {
    await prisma.aiCredit.update({ where: { id: existingCredit.id }, data: { balance: 99999 } });
  }

  const existingSub = await prisma.subscription.findUnique({ where: { userId: devUser.id } });
  if (!existingSub) {
    const sub = await prisma.subscription.create({
      data: { userId: devUser.id, plan: "corporate", status: "active" },
    });
    // Create team for dev
    const existingTeam = await prisma.team.findUnique({ where: { subscriptionId: sub.id } });
    if (!existingTeam) {
      await prisma.team.create({
        data: {
          name: "Dev Team",
          slug: "dev-team",
          ownerId: devUser.id,
          subscriptionId: sub.id,
          members: { create: { userId: devUser.id, role: "admin" } },
        },
      });
    }
  } else if (existingSub.plan !== "corporate") {
    await prisma.subscription.update({
      where: { id: existingSub.id },
      data: { plan: "corporate", status: "active" },
    });
    // Ensure team exists
    const existingTeam = await prisma.team.findUnique({ where: { subscriptionId: existingSub.id } });
    if (!existingTeam) {
      await prisma.team.create({
        data: {
          name: "Dev Team",
          slug: "dev-team",
          ownerId: devUser.id,
          subscriptionId: existingSub.id,
          members: { create: { userId: devUser.id, role: "admin" } },
        },
      });
    }
  }

  // Sign in as dev user via NextAuth
  // We return the user info — the client will use signIn("credentials") with a special dev password
  return NextResponse.json({ ok: true, email: devUser.email, password: devCode });
}
