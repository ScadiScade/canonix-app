import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/auth/dev-login — dev access code login (bypasses email verification)
// DISABLED in production for security
// Body: { code: string, email: string }
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Dev login is disabled in production" }, { status: 403 });
  }

  const { code, email } = await req.json();
  const devCode = process.env.DEV_ACCESS_CODE;

  if (!devCode || code !== devCode) {
    return NextResponse.json({ error: "Неверный код" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, email: user.email, password: devCode });
}
