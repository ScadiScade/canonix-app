import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getTokenStore } from "@/lib/telegram-auth-store";

// GET /api/auth/telegram/check?token=xxx — poll for auth confirmation
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ status: "error" }, { status: 400 });

  const store = getTokenStore();
  const entry = store.get(token);

  if (!entry) return NextResponse.json({ status: "expired" }, { status: 410 });
  if (!entry.userData) return NextResponse.json({ status: "pending" });

  // Generate HMAC hash from user data + bot token so the client can't forge it
  const botToken = process.env.TELEGRAM_BOT_TOKEN!;
  const dataWithDate: Record<string, string> = { ...entry.userData, auth_date: String(Math.floor(Date.now() / 1000)) };
  const checkString = Object.keys(dataWithDate)
    .sort()
    .map(k => `${k}=${dataWithDate[k]}`)
    .join("\n");
  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const hash = crypto.createHmac("sha256", secretKey).update(checkString).digest("hex");

  // Token consumed — return user data with valid hash
  store.delete(token);
  return NextResponse.json({ status: "ok", user: { ...dataWithDate, hash } });
}
