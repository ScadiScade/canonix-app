import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/pricing — all active pricing config from DB
export async function GET() {
  const items = await prisma.pricingConfig.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  const plans = items.filter(i => i.type === "plan");
  const creditPacks = items.filter(i => i.type === "creditPack");

  return NextResponse.json({ plans, creditPacks });
}

// POST /api/pricing — seed default pricing if table is empty (admin only)
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true } });
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || user?.email !== adminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const count = await prisma.pricingConfig.count();
  if (count > 0) {
    return NextResponse.json({ seeded: false, count });
  }

  const defaults = [
    // Plans
    { type: "plan", key: "pro", label: "Pro", credits: 200, price: 29900, sortOrder: 1 },
    { type: "plan", key: "corporate", label: "Корпоративная", credits: 800, price: 99900, sortOrder: 2 },
    // Credit packs
    { type: "creditPack", key: "small", label: "50 кредитов", credits: 50, price: 14900, sortOrder: 1 },
    { type: "creditPack", key: "medium", label: "200 кредитов", credits: 200, price: 49000, sortOrder: 2 },
    { type: "creditPack", key: "large", label: "500 кредитов", credits: 500, price: 99000, sortOrder: 3 },
  ];

  await prisma.pricingConfig.createMany({ data: defaults });
  return NextResponse.json({ seeded: true, count: defaults.length });
}
