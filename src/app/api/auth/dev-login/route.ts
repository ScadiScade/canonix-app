import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/auth/dev-login — dev access code login (bypasses email verification)
// DISABLED in production for security
// Body: { code: string, role?: "dev" | "tester" }
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Dev login is disabled in production" }, { status: 403 });
  }

  const { code, role = "dev" } = await req.json();
  const devCode = process.env.DEV_ACCESS_CODE;

  if (!devCode || code !== devCode) {
    return NextResponse.json({ error: "Неверный код" }, { status: 401 });
  }

  const configs: Record<string, { email: string; name: string; plan: string; credits: number; walletKopecks: number }> = {
    dev: { email: "dev@canonix.local", name: "Dev", plan: "corporate", credits: 99999, walletKopecks: 10000000 },
    tester: { email: "tester@canonix.local", name: "Tester", plan: "free", credits: 0, walletKopecks: 0 },
  };

  const cfg = configs[role] ?? configs.dev;

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email: cfg.email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email: cfg.email, name: cfg.name, emailVerified: new Date() },
    });
  }

  // Set credits
  const existingCredit = await prisma.aiCredit.findUnique({ where: { userId: user.id } });
  if (!existingCredit) {
    await prisma.aiCredit.create({ data: { userId: user.id, balance: cfg.credits } });
  } else {
    await prisma.aiCredit.update({ where: { id: existingCredit.id }, data: { balance: cfg.credits } });
  }

  // Set subscription
  const existingSub = await prisma.subscription.findUnique({ where: { userId: user.id } });
  let sub = existingSub;
  if (!existingSub) {
    sub = await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: cfg.plan,
        status: "active",
        currentPeriodEnd: cfg.plan !== "free" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
      },
    });
  } else {
    sub = await prisma.subscription.update({
      where: { id: existingSub.id },
      data: {
        plan: cfg.plan,
        status: "active",
        currentPeriodEnd: cfg.plan !== "free" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
        pendingPlan: null,
      },
    });
  }

  // Set wallet
  const existingWallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  if (!existingWallet) {
    await prisma.wallet.create({ data: { userId: user.id, balance: cfg.walletKopecks } });
  } else {
    await prisma.wallet.update({ where: { id: existingWallet.id }, data: { balance: cfg.walletKopecks } });
  }

  // Create team for corporate
  if (cfg.plan === "corporate") {
    const existingTeam = await prisma.team.findUnique({ where: { subscriptionId: sub!.id } });
    if (!existingTeam) {
      await prisma.team.create({
        data: {
          name: `${cfg.name} Team`,
          slug: `${cfg.name.toLowerCase()}-team`,
          ownerId: user.id,
          subscriptionId: sub!.id,
          members: { create: { userId: user.id, role: "admin" } },
        },
      });
    }
  }

  return NextResponse.json({ ok: true, email: user.email, password: devCode, role });
}
