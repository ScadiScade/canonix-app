import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Resend } from "resend";
import crypto from "crypto";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

// POST /api/auth/verify/send — send verification email
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resend = getResend();
  if (!resend) {
    return NextResponse.json({ error: "Email service not configured" }, { status: 503 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.emailVerified) {
    return NextResponse.json({ error: "Email уже подтверждён" }, { status: 400 });
  }

  // Generate verification token
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

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

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Resend error:", e);
    return NextResponse.json({ error: "Не удалось отправить письмо" }, { status: 500 });
  }
}
