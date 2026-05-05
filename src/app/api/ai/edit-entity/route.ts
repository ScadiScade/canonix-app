import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkCredits, deductCredits } from "@/lib/credits";
import { validateBody, editEntitySchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.0-flash-001";
const COST = 3;

const SYSTEM_PROMPT = `Ты — ассистент для редактирования сущностей в вымышленной вселенной.
Пользователь даёт инструкцию, как изменить карточку. Ты возвращаешь ТОЛЬКО валидный JSON (без markdown-обёрток, без комментариев) с обновлёнными полями.

Формат ответа — объект с полями, которые нужно обновить (остальные останутся без изменений):
{
  "name": "Новое имя (если нужно)",
  "description": "Обновлённое описание",
  "date": "Новая дата или null",
  "customFields": { "ключ": "значение" },
  "notes": [{ "title": "Заголовок", "content": "Текст заметки" }]
}

Возвращай ТОЛЬКО поля, которые реально изменились. Если поле не нужно менять — не включай его в ответ.`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(session.user.id, "ai");
  if (rl) return rl;

  const body = await req.json();
  const parsed = validateBody(editEntitySchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { entityId, instruction } = parsed.data;

  // Fetch entity with ownership check
  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    include: { universe: true },
  });
  if (!entity || entity.universe.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check credits
  const { ok: hasCredits, balance, creditId } = await checkCredits(session.user.id, COST);
  if (!hasCredits) {
    return NextResponse.json({ error: "Недостаточно кредитов", balance, cost: COST }, { status: 402 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  const entityContext = `Текущая карточка:
Имя: ${entity.name}
Тип: ${entity.type}
Описание: ${entity.description || "нет"}
Дата: ${entity.date || "нет"}
Поля: ${entity.customFields}
Заметки: ${entity.notes}`;

  const messages: { role: string; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `${entityContext}\n\nИнструкция: ${instruction}` },
  ];

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://canonix.app",
        "X-OpenRouter-Title": "Canonix",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error("OpenRouter error:", await response.text());
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content || "";
    text = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "AI вернул невалидный JSON", raw: text }, { status: 422 });
    }

    // Deduct credits
    const newBalance = await deductCredits(session.user.id, creditId, COST);

    return NextResponse.json({
      updates: parsed,
      cost: COST,
      balance: newBalance,
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Insufficient credits") {
      return NextResponse.json({ error: "Недостаточно кредитов" }, { status: 402 });
    }
    console.error("AI edit-entity error:", e);
    return NextResponse.json({ error: "AI edit failed" }, { status: 500 });
  }
}
