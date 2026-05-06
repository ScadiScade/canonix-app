import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkCredits, deductCredits } from "@/lib/credits";
import { validateBody, suggestRelationsSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.0-flash-001";
const COST_PER_RELATION = 1;

const SYSTEM_PROMPT = `Ты — ассистент для поиска связей между сущностями в вымышленной вселенной.
Пользователь даёт список сущностей. Ты анализируешь их имена, типы, описания и предлагаешь логичные связи между ними.

Формат ответа — ТОЛЬКО валидный JSON (без markdown-обёрток, без комментариев):
{
  "relations": [
    {
      "sourceName": "Имя исходной сущности",
      "targetName": "Имя целевой сущности",
      "label": "тип связи"
    }
  ]
}

Правила:
- Предлагай 3-8 связей, которые логично вытекают из описаний и типов сущностей
- sourceName и targetName должны ТОЧНО совпадать с именами из списка сущностей
- label — краткое описание отношения (1-3 слова), например: "союзник", "враг", "учитель", "родитель", "создатель"
- Не предлагай связи, которые уже существуют (они перечислены в EXISTING_RELATIONS)
- Если не хватает данных для связей — возвращай пустой массив
- Отвечай ТОЛЬКО JSON`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(session.user.id, "ai");
  if (rl) return rl;

  const body = await req.json();
  const parsed = validateBody(suggestRelationsSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { universeId } = parsed.data;

  // Verify ownership + fetch universe data
  const universe = await prisma.universe.findUnique({
    where: { id: universeId },
    include: {
      entities: {
        include: {
          sourceRelations: { include: { target: { select: { name: true } } } },
          targetRelations: { include: { source: { select: { name: true } } } },
        },
      },
    },
  });
  if (!universe || universe.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (universe.entities.length < 2) {
    return NextResponse.json({ error: "Need at least 2 entities to suggest relations" }, { status: 400 });
  }

  // Build context
  const entityList = universe.entities.map(e =>
    `- ${e.name} (${e.type})${e.description ? `: ${e.description.slice(0, 150)}` : ""}`
  ).join("\n");

  const existingRels = universe.entities.flatMap(e => [
    ...e.sourceRelations.map(r => `${e.name} → ${r.label} → ${r.target.name}`),
    ...e.targetRelations.map(r => `${r.source.name} → ${r.label} → ${e.name}`),
  ]);
  const existingRelsStr = existingRels.length > 0
    ? `\n\nEXISTING_RELATIONS (не дублируй):\n${existingRels.join("\n")}`
    : "";

  const maxCost = Math.min(8, universe.entities.length) * COST_PER_RELATION;
  const { ok: hasCredits, balance, creditId } = await checkCredits(session.user.id, maxCost);
  if (!hasCredits) {
    return NextResponse.json({ error: "Недостаточно кредитов", balance, cost: maxCost }, { status: 402 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  const messages: { role: string; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Вселенная: ${universe.name}\n\nСущности:\n${entityList}${existingRelsStr}\n\nПредложи логичные связи между этими сущностями.` },
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

    const rawRelations = Array.isArray(parsed.relations) ? parsed.relations : [];

    // Validate: match source/target names to actual entities
    const entityNames = new Map(universe.entities.map(e => [e.name.toLowerCase(), e]));
    const validRelations = rawRelations.filter((r: Record<string, unknown>) => {
      const src = entityNames.get(String(r.sourceName).toLowerCase());
      const tgt = entityNames.get(String(r.targetName).toLowerCase());
      return src && tgt && src.id !== tgt.id && typeof r.label === "string" && r.label.trim();
    }).map((r: Record<string, unknown>) => {
      const src = entityNames.get(String(r.sourceName).toLowerCase())!;
      const tgt = entityNames.get(String(r.targetName).toLowerCase())!;
      return {
        sourceId: src.id,
        sourceName: src.name,
        targetId: tgt.id,
        targetName: tgt.name,
        label: String(r.label).trim(),
      };
    });

    const cost = validRelations.length * COST_PER_RELATION || maxCost;
    const newBalance = await deductCredits(session.user.id, creditId, cost);

    return NextResponse.json({
      relations: validRelations,
      cost,
      balance: newBalance,
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Insufficient credits") {
      return NextResponse.json({ error: "Недостаточно кредитов" }, { status: 402 });
    }
    console.error("AI suggest-relations error:", e);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
