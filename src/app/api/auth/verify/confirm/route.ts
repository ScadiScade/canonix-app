import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/auth/verify/confirm?token=... — confirm email via token
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?verify=missing", req.url));
  }

  const vt = await prisma.verificationToken.findUnique({ where: { token } });
  if (!vt || !vt.identifier.startsWith("email-verify:")) {
    return NextResponse.redirect(new URL("/login?verify=invalid", req.url));
  }

  if (vt.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } });
    return NextResponse.redirect(new URL("/login?verify=expired", req.url));
  }

  const userId = vt.identifier.replace("email-verify:", "");

  // Mark email as verified
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: new Date() },
  });

  // Delete used token
  await prisma.verificationToken.delete({ where: { token } });

  return NextResponse.redirect(new URL("/login?verify=success", req.url));
}
