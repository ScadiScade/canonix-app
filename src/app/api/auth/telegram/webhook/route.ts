import { NextRequest, NextResponse } from "next/server";
import { getTokenStore, generateToken } from "@/lib/telegram-auth-store";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const SITE_URL = process.env.NEXTAUTH_URL!;

async function sendMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

async function getUserPhoto(telegramId: number): Promise<string> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getUserProfilePhotos?user_id=${telegramId}&limit=1`
    );
    const data = await res.json();
    if (!data.ok || !data.result?.photos?.length) return "";

    const photo = data.result.photos[0];
    const fileId = photo[photo.length - 1].file_id; // largest size

    const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json();
    if (!fileData.ok) return "";

    return `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
  } catch {
    return "";
  }
}

// POST /api/auth/telegram/webhook — receives updates from Telegram Bot API
export async function POST(req: NextRequest) {
  // Verify Telegram webhook secret
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Handle /start command with auth token
  if (body.message?.text?.startsWith("/start ")) {
    const authToken = body.message.text.replace("/start ", "").trim();
    const from = body.message.from;

    if (!from || !authToken) return NextResponse.json({ ok: true });

    const store = getTokenStore();
    const entry = store.get(authToken);

    if (!entry || entry.userData) {
      // Token not found or already used — send generic welcome
      await sendMessage(from.id, "👋 Привет! Чтобы войти в Canonix, откройте сайт и нажмите «Продолжить с Telegram».");
      return NextResponse.json({ ok: true });
    }

    // Get user profile photo
    const photoUrl = await getUserPhoto(from.id);

    // Store verified user data
    entry.userData = {
      id: String(from.id),
      first_name: from.first_name || "",
      last_name: from.last_name || "",
      username: from.username || String(from.id),
      photo_url: photoUrl,
    };

    // Send link back to website for auto-login
    const displayName = [from.first_name, from.last_name].filter(Boolean).join(" ");
    const loginUrl = `${SITE_URL}/login?tg_token=${authToken}`;
    await sendMessage(from.id, `✅ ${displayName}, вы авторизованы в Canonix!\n\nНажмите кнопку ниже, чтобы вернуться на сайт:\n\n${loginUrl}`);

    return NextResponse.json({ ok: true });
  }

  // Handle plain /start or /login — generate auth link to website
  if (body.message?.text === "/start" || body.message?.text === "/login") {
    const from = body.message?.from;
    if (!from) return NextResponse.json({ ok: true });

    // Get user profile photo
    const photoUrl = await getUserPhoto(from.id);

    // Generate token and store user data immediately
    const token = generateToken();
    const store = getTokenStore();
    const entry = store.get(token);
    if (entry) {
      entry.userData = {
        id: String(from.id),
        first_name: from.first_name || "",
        last_name: from.last_name || "",
        username: from.username || String(from.id),
        photo_url: photoUrl,
      };
    }

    // Send login link to website
    const loginUrl = `${SITE_URL}/login?tg_token=${token}`;
    const displayName = [from.first_name, from.last_name].filter(Boolean).join(" ") || "друг";
    await sendMessage(from.id, `👋 Привет, ${displayName}!\n\nНажмите кнопку ниже, чтобы войти в Canonix:\n\n${loginUrl}\n\nСсылка действительна 5 минут.`);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
