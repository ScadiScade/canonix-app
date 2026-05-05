import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Resend } from "resend";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

// POST /api/auth/verify/resend — resend verification email by email address (no auth required)
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req.headers.get("x-forwarded-for") || "global", "auth");
  if (rl) return rl;

  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Don't reveal whether user exists — standard security practice
    return NextResponse.json({ ok: true });
  }

  if (user.emailVerified) {
    return NextResponse.json({ ok: true });
  }

  const resend = getResend();
  if (!resend) {
    return NextResponse.json({ error: "Email service not configured" }, { status: 503 });
  }

  // Rate limit: delete any existing tokens for this user and create new one
  await prisma.verificationToken.deleteMany({
    where: { identifier: `email-verify:${user.id}` },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.verificationToken.create({
    data: {
      identifier: `email-verify:${user.id}`,
      token,
      expires,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3001";
  const verifyUrl = `${baseUrl}/api/auth/verify/confirm?token=${token}`;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM || "Canonix <noreply@canonix.app>",
      to: user.email,
      subject: "Подтвердите ваш email — Canonix",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="font-size: 20px; font-weight: 300; color: #1a1a1a; margin-bottom: 24px;">Подтверждение email</h2>
          <p style="font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 24px;">
            Нажмите кнопку ниже, чтобы подтвердить ваш email <strong>${user.email}</strong> на Canonix.
            Ссылка действительна 24 часа.
          </p>
          <a href="${verifyUrl}" style="display: inline-block; background: #6366f1; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 500;">
            Подтвердить email
          </a>
          <p style="font-size: 12px; color: #999; margin-top: 24px;">
            Если вы не регистрировались на Canonix, просто проигнорируйте это письмо.
          </p>
        </div>
      `,
    });
  } catch (e) {
    console.error("Failed to send verification email:", e);
    return NextResponse.json({ error: "Не удалось отправить письмо" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
