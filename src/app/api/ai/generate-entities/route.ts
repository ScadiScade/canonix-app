import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkCredits, deductCredits } from "@/lib/credits";
import { validateBody, generateEntitiesSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.0-flash-001";

const SYSTEM_PROMPT = `Ты — ассистент для создания сущностей в вымышленной вселенной. 
Пользователь описывает, что нужно сгенерировать. Ты возвращаешь ТОЛЬКО валидный JSON (без markdown-обёрток, без комментариев).

ВАЖНО: Проанализируй существующие сущности и связи вселенной перед генерацией:
- НЕ дублируй уже существующие сущности (похожие имена/роли)
- Развивай и дополняй существующий лор, а не создавай параллельный
- Устанавливай связи с существующими сущностями (указывай их имена в customFields._link)
- Учитывай уже установленные отношения между персонажами/местами
- Если во вселенной уже есть сущности, ПРЕЖДЕ ВСЕГО добавляй связи и детали для них.
  Создавай НОВЫЕ сущности только если пользователь явно описал их в запросе.
  Если запрос пустой (авто-режим), сосредоточься на связях и развитии существующих сущностей,
  а новые создавай только если это логично дополняет мир.

Формат ответа:
{
  "entities": [
    {
      "name": "Имя сущности",
      "type": "slug группы из AVAILABLE_TYPES",
      "description": "Описание с деталями, учитывающее существующий лор",
      "date": "Дата если применимо, иначе null",
      "customFields": { "ключ": "значение", "_link": "имя существующей сущности для связи" },
      "sources": []
    }
  ],
  "relations": [
    {
      "sourceIndex": 0,
      "targetIndex": 1,
      "label": "тип связи"
    }
  ]
}

Правила:
- type строго один из AVAILABLE_TYPES (указаны ниже в контексте вселенной)
- sourceIndex и targetIndex — индексы в массиве entities (0-based)
- relations опциональны — добавляй только если логично
- description — 2-4 предложения с конкретными деталями
- customFields — структурированные поля, соответствующие полям группы
- Все значения в customFields должны быть строками
- Генерируй ровно COUNT сущностей (по умолчанию 5) и 2-5 связей
- Отвечай ТОЛЬКО JSON, без пояснений`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(session.user.id, "ai");
  if (rl) return rl;

  const body = await req.json();
  const parsed = validateBody(generateEntitiesSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { prompt, universeId, targetGroupId, count } = parsed.data;

  // Verify ownership + fetch full universe data for analysis
  const universe = await prisma.universe.findUnique({
    where: { id: universeId },
    include: {
      groups: true,
      entities: {
        include: {
          sourceRelations: { include: { target: true } },
          targetRelations: { include: { source: true } },
        },
      },
    },
  });
  if (!universe || universe.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Build rich context from existing data
  const existingEntities = universe.entities.map(e => {
    const rels = [
      ...e.sourceRelations.map(r => `${e.name} → ${r.label} → ${r.target.name}`),
      ...e.targetRelations.map(r => `${r.source.name} → ${r.label} → ${e.name}`),
    ];
    return `- ${e.name} (${e.type})${e.description ? `: ${e.description.slice(0, 120)}` : ""}${rels.length ? ` | Связи: ${rels.join("; ")}` : ""}`;
  }).join("\n");

  const universeSummary = `Вселенная: ${universe.name}\nОписание: ${universe.description || "нет"}\n\nСуществующие сущности (${universe.entities.length}):\n${existingEntities || "пока нет сущностей"}`;

  const entityCount = count || 5;
  const COST = entityCount; // 1 credit per entity

  // Check credits
  const { ok: hasCredits, balance, creditId } = await checkCredits(session.user.id, COST);
  if (!hasCredits) {
    return NextResponse.json({ error: "Недостаточно кредитов", balance, cost: COST }, { status: 402 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  // If target group is specified, constrain AI to generate entities of that type
  const targetGroup = targetGroupId ? universe.groups.find(g => g.id === targetGroupId) : null;
  const groupConstraint = targetGroup
    ? `\n\nВАЖНО: Все сущности должны иметь type="${targetGroup.slug}" (${targetGroup.name}). Поля: ${JSON.parse(targetGroup.fields || "[]").join(", ")}. Не используй другие типы.`
    : "";

  // Build AVAILABLE_TYPES from universe groups (fields is JSON string from Prisma)
  const availableTypes = universe.groups.map(g => {
    let fields: string[] = [];
    try { fields = JSON.parse(g.fields || "[]"); } catch { fields = []; }
    return `${g.slug} (${g.name}, поля: ${fields.join(", ")})`;
  }).join(", ");
  const typesInfo = availableTypes
    ? `\n\nAVAILABLE_TYPES: ${availableTypes}`
    : "\n\nAVAILABLE_TYPES: other (У этой вселенной пока нет групп. Используй type=\"other\" для всех сущностей. Пользователю стоит создать группы через генерацию групп.)";

  const messages: { role: string; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT.replace("COUNT", String(entityCount)) },
    { role: "user", content: `Текущее состояние вселенной:\n${universeSummary}${typesInfo}${groupConstraint}\n\nЗадание: ${prompt || "Сгенерируй новые сущности и связи, которые логично дополнят вселенную на основе её тематики и существующих данных."}\n\nСгенерируй ровно ${entityCount} сущностей.` },
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
        max_tokens: 4000,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      console.error("OpenRouter error:", await response.text());
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content || "";

    // Strip markdown code fences if present
    text = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "AI вернул невалидный JSON", raw: text }, { status: 422 });
    }

    // Normalize AI response — ensure all values are safe
    const rawEntities = Array.isArray(parsed.entities) ? parsed.entities : [];
    const rawRelations = Array.isArray(parsed.relations) ? parsed.relations : [];

    const normalizedEntities = rawEntities.slice(0, 10).map((e: Record<string, unknown>) => {
      // Ensure customFields values are all strings for display
      const cf: Record<string, unknown> = e.customFields && typeof e.customFields === "object" ? e.customFields as Record<string, unknown> : {};
      const cleanCf: Record<string, string> = {};
      for (const [k, v] of Object.entries(cf)) {
        if (k === "_link") { cleanCf[k] = String(v); continue; }
        cleanCf[k] = v === null || v === undefined ? "" : String(v);
      }
      return {
        name: String(e.name || ""),
        type: String(e.type || "other"),
        description: e.description ? String(e.description) : "",
        date: e.date ? String(e.date) : null,
        customFields: cleanCf,
        notes: Array.isArray(e.notes) ? e.notes : [],
        sources: [],
      };
    });

    // Clamp relation indices to valid range
    const normalizedRelations = rawRelations.filter((r: Record<string, unknown>) =>
      typeof r.sourceIndex === "number" && typeof r.targetIndex === "number" && typeof r.label === "string" &&
      r.sourceIndex < normalizedEntities.length && r.targetIndex < normalizedEntities.length
    ).map((r: Record<string, unknown>) => ({
      sourceIndex: r.sourceIndex as number,
      targetIndex: r.targetIndex as number,
      label: String(r.label),
    }));

    // Deduct credits
    const newBalance = await deductCredits(session.user.id, creditId, COST);

    // Return parsed entities + relations for preview (not yet saved)
    return NextResponse.json({
      entities: normalizedEntities,
      relations: normalizedRelations,
      cost: COST,
      balance: newBalance,
    });
  } catch (e) {
    console.error("AI generate-entities error:", e);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
