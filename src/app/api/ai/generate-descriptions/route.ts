import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkCredits, deductCredits } from "@/lib/credits";
import { validateBody, generateDescriptionsSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.0-flash-001";
const COST_PER_ENTITY = 1;

const SYSTEM_PROMPT = `Ты — ассистент для создания описаний сущностей в вымышленной вселенной.
Пользователь даёт список сущностей без описаний (или с краткими описаниями). Ты генерируешь развёрнутые описания для каждой.

Формат ответа — ТОЛЬКО валидный JSON (без markdown-обёрток, без комментариев):
{
  "descriptions": [
    {
      "name": "Имя сущности",
      "description": "Развёрнутое описание 2-4 предложения с конкретными деталями"
    }
  ]
}

Правила:
- Описание должно быть 2-4 предложения с конкретными деталями
- Учитывай тип сущности и контекст вселенной
- Описания должны быть связными и логичными в рамках мира
- Не меняй имя сущности, только описание
- Отвечай ТОЛЬКО JSON`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(session.user.id, "ai");
  if (rl) return rl;

  const body = await req.json();
  const parsed = validateBody(generateDescriptionsSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { universeId } = parsed.data;

  // Verify ownership + fetch universe data
  const universe = await prisma.universe.findUnique({
    where: { id: universeId },
    include: {
      groups: true,
      entities: true,
    },
  });
  if (!universe || universe.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Filter entities that need descriptions (empty or very short)
  const needyEntities = universe.entities.filter(e => !e.description || e.description.length < 20);
  if (needyEntities.length === 0) {
    return NextResponse.json({ error: "All entities already have descriptions" }, { status: 400 });
  }

  const maxEntities = Math.min(needyEntities.length, 10);
  const targetEntities = needyEntities.slice(0, maxEntities);

  const COST = maxEntities * COST_PER_ENTITY;
  const { ok: hasCredits, balance, creditId } = await checkCredits(session.user.id, COST);
  if (!hasCredits) {
    return NextResponse.json({ error: "Недостаточно кредитов", balance, cost: COST }, { status: 402 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  // Build context
  const entityList = targetEntities.map(e =>
    `- ${e.name} (${e.type})${e.description ? `: ${e.description}` : ": нет описания"}`
  ).join("\n");

  const groupInfo = universe.groups.map(g => `${g.slug} (${g.name})`).join(", ");

  const messages: { role: string; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Вселенная: ${universe.name}\nОписание: ${universe.description || "нет"}\nГруппы: ${groupInfo}\n\nСущности без описаний:\n${entityList}\n\nСгенерируй описания для этих ${targetEntities.length} сущностей.` },
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
        max_tokens: 3000,
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

    const rawDescriptions = Array.isArray(parsed.descriptions) ? parsed.descriptions : [];

    // Match to entity IDs
    const entityNameMap = new Map(universe.entities.map(e => [e.name.toLowerCase(), e]));
    const validDescriptions = rawDescriptions.filter((d: Record<string, unknown>) => {
      const entity = entityNameMap.get(String(d.name).toLowerCase());
      return entity && typeof d.description === "string" && d.description.trim();
    }).map((d: Record<string, unknown>) => {
      const entity = entityNameMap.get(String(d.name).toLowerCase())!;
      return {
        entityId: entity.id,
        name: entity.name,
        description: String(d.description).trim(),
      };
    });

    const cost = validDescriptions.length * COST_PER_ENTITY || COST;
    const newBalance = await deductCredits(session.user.id, creditId, cost);

    return NextResponse.json({
      descriptions: validDescriptions,
      count: validDescriptions.length,
      cost,
      balance: newBalance,
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Insufficient credits") {
      return NextResponse.json({ error: "Недостаточно кредитов" }, { status: 402 });
    }
    console.error("AI generate-descriptions error:", e);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
