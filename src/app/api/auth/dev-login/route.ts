import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/auth/dev-login — dev access code login (bypasses email verification)
// Protected by DEV_ACCESS_CODE env variable
// Body: { code: string, email: string }
export async function POST(req: NextRequest) {
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
