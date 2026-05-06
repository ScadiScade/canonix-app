import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkCredits, deductCredits } from "@/lib/credits";
import { validateBody, generateBookSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.0-flash-001";
const COST = 10;

const SYSTEM_PROMPTS: Record<string, string> = {
  novel: `Ты — писатель, создающий рассказы на основе вымышленной вселенной.
Пользователь даёт данные вселенной (сущности, связи, сюжеты). Ты пишешь связный художественный текст.

Формат ответа — ТОЛЬКО валидный JSON (без markdown-обёрток):
{
  "title": "Название рассказа",
  "chapters": [
    { "title": "Название главы", "content": "Текст главы 3-5 абзацев" }
  ]
}

Правила:
- 3-6 глав, каждая 3-5 абзацев
- Используй имена и описания сущностей из вселенной
- Связывай главы логичным сюжетом
- Пиши живым литературным языком
- Отвечай ТОЛЬКО JSON`,

  comic: `Ты — сценарист комиксов на основе вымышленной вселенной.
Пользователь даёт данные вселенной. Ты создаёшь сценарий комикса с описанием панелей.

Формат ответа — ТОЛЬКО валидный JSON (без markdown-обёрток):
{
  "title": "Название комикса",
  "pages": [
    {
      "panels": [
        { "description": "Описание визуала панели", "dialogue": "Текст реплики или пусто", "character": "Имя персонажа или пусто" }
      ]
    }
  ]
}

Правила:
- 3-5 страниц, по 2-4 панели на страницу
- description — что изображено (для генерации/рендера)
- dialogue — реплика персонажа (может быть пустой для silent-панелей)
- character — кто говорит
- Используй сущности вселенной
- Отвечай ТОЛЬКО JSON`,

  guide: `Ты — автор энциклопедического справочника по вымышленной вселенной.
Пользователь даёт данные вселенной. Ты создаёшь структурированный справочник.

Формат ответа — ТОЛЬКО валидный JSON (без markdown-обёрток):
{
  "title": "Название справочника",
  "sections": [
    { "title": "Название раздела", "content": "Энциклопедический текст 2-4 абзаца" }
  ]
}

Правила:
- 5-10 разделов, каждый 2-4 абзаца
- Разделы: обзор мира, география, культура, ключевые фигуры, история, технологии и т.д.
- Фактологичный, энциклопедический стиль
- Используй данные сущностей
- Отвечай ТОЛЬКО JSON`,
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(session.user.id, "ai");
  if (rl) return rl;

  const body = await req.json();
  const parsed = validateBody(generateBookSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { universeId, type = "novel", prompt } = parsed.data;

  const universe = await prisma.universe.findUnique({
    where: { id: universeId },
    include: {
      entities: { include: { group: { select: { name: true } } } },
      relations: true,
      storylines: { include: { chapters: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } },
    },
  });

  if (!universe) return NextResponse.json({ error: "Universe not found" }, { status: 404 });
  if (universe.userId !== session.user.id) {
    let canAccess = false;
    if (universe.teamId) {
      const member = await prisma.teamMember.findFirst({ where: { teamId: universe.teamId, userId: session.user.id } });
      if (member) canAccess = true;
      const owner = await prisma.team.findFirst({ where: { id: universe.teamId, ownerId: session.user.id } });
      if (owner) canAccess = true;
    }
    if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { ok: hasCredits, balance, creditId } = await checkCredits(session.user.id, COST);
  if (!hasCredits) {
    return NextResponse.json({ error: "Недостаточно кредитов", balance, cost: COST }, { status: 402 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI service not configured" }, { status: 503 });

  // Build context
  const entityList = universe.entities.map(e =>
    `- ${e.name} (${e.type}${e.group ? `, ${e.group.name}` : ""})${e.description ? `: ${e.description.slice(0, 200)}` : ""}`
  ).join("\n");

  const relList = universe.relations.map(r => {
    const src = universe.entities.find(e => e.id === r.sourceId);
    const tgt = universe.entities.find(e => e.id === r.targetId);
    return src && tgt ? `${src.name} → ${r.label} → ${tgt.name}` : "";
  }).filter(Boolean).join("\n");

  const storyList = universe.storylines.map(s =>
    `Сюжет «${s.title}»:\n${s.chapters.map(ch => `  Глава «${ch.title}»: ${ch.content.slice(0, 150)}`).join("\n")}`
  ).join("\n\n");

  const userPrompt = `Вселенная: ${universe.name}\n${universe.description ? `Описание: ${universe.description}\n` : ""}\nСущности:\n${entityList}\n\nСвязи:\n${relList}\n\n${storyList ? `Сюжеты:\n${storyList}` : ""}${prompt ? `\n\nДополнительные указания: ${prompt}` : ""}`;

  const messages: { role: string; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPTS[type] || SYSTEM_PROMPTS.novel },
    { role: "user", content: userPrompt },
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
        max_tokens: 8000,
        temperature: 0.9,
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

    const newBalance = await deductCredits(session.user.id, creditId, COST);

    // Save as book
    const book = await prisma.book.create({
      data: {
        title: parsed.title || universe.name,
        description: `AI-generated ${type}`,
        type,
        content: JSON.stringify(parsed),
        universeId,
      },
    });

    return NextResponse.json({ book, cost: COST, balance: newBalance });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Insufficient credits") {
      return NextResponse.json({ error: "Недостаточно кредитов" }, { status: 402 });
    }
    console.error("AI generate-book error:", e);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
