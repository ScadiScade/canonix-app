import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkCredits, deductCredits } from "@/lib/credits";
import { validateBody, generateGroupsSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.0-flash-001";
const COST = 5;

const SYSTEM_PROMPT = `Ты — ассистент для создания групп сущностей в вымышленной вселенной.
Пользователь описывает тематику вселенной. Ты возвращаешь ТОЛЬКО валидный JSON (без markdown-обёрток, без комментариев).

Формат ответа:
{
  "groups": [
    {
      "name": "Название группы (на русском)",
      "slug": "english-slug",
      "color": "#HEXCOLOR",
      "icon": "IconName",
      "fields": ["Поле1", "Поле2", "Поле3"]
    }
  ]
}

Правила:
- Создавай 3-8 групп, подходящих под тематику
- Slug — только латиница, дефисы, до 30 символов
- Цвет — HEX-код, яркий и различимый между группами
- Icon — одно из: User, Globe, Zap, Building2, Sword, Car, Dna, Ship, Rocket, Crown, Shield, Skull, Tag, Star, Heart, Flame
- Fields — 2-5 полей, специфичных для этой группы (например: для персонажа — «Роль», «Возраст», «Статус»)
- Если вселенная уже имеет группы, учитывай их и дополняй, а не дублируй`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(session.user.id, "ai");
  if (rl) return rl;

  const body = await req.json();
  const parsed = validateBody(generateGroupsSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { prompt, existingGroups } = parsed.data;

  // Check credits
  const { ok: hasCredits, balance: chkBalance, creditId } = await checkCredits(session.user.id, COST);
  if (!hasCredits) {
    return NextResponse.json({ error: "Недостаточно кредитов", balance: chkBalance, cost: COST }, { status: 402 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  // Use existing groups passed from client (includes both DB groups and their fields)
  const existingInfo = existingGroups && existingGroups.length > 0
    ? `\n\nСуществующие группы: ${existingGroups.map((g: { name: string; slug: string; fields: string[] }) => `${g.name} (${g.slug}, поля: ${g.fields.join(", ")})`).join("; ")}`
    : "";

  const messages: { role: string; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Тематика вселенной: ${prompt.trim()}${existingInfo}` },
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
        temperature: 0.8,
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
      groups: parsed.groups || [],
      cost: COST,
      balance: newBalance,
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Insufficient credits") {
      return NextResponse.json({ error: "Недостаточно кредитов" }, { status: 402 });
    }
    console.error("AI generate-groups error:", e);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
