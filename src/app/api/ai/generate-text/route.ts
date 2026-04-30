import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkCredits, deductCredits } from "@/lib/credits";
import { validateBody, generateTextSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Cost in credits per action type
const CREDIT_COSTS: Record<string, number> = {
  scenario: 3,       // Generate full scenario/plot
  suggestion: 1,     // Quick suggestion
  edit: 2,           // Edit/rewrite text
  expand: 2,         // Expand description
};

// Model tiers: cheap for quick tasks, better quality for complex generation
const MODELS: Record<string, string> = {
  cheap: "qwen/qwen3.6-flash",           // $0.25/$1.50 per 1M tokens — fastest, cheapest
  standard: "google/gemini-2.0-flash-001", // $0.50/$3.00 per 1M tokens — good balance
  quality: "anthropic/claude-haiku-latest", // $1/$5 per 1M tokens — best quality for price
};

const MODEL = MODELS.standard;

const SYSTEM_PROMPT = `Ты — креативный ассистент для создания вымышленных вселенных. Ты помогаешь авторам разрабатывать миры, персонажей, события, локации и связи между ними. Отвечай на русском языке. Будь конкретным и детальным, избегай общих фраз. Формат ответа: структурированный текст с заголовками.`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(session.user.id, "ai");
  if (rl) return rl;

  const body = await req.json();
  const parsed = validateBody(generateTextSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { type, prompt, context } = parsed.data;

  const cost = CREDIT_COSTS[type] || 2;

  // Check credits
  const { ok: hasCredits, balance, creditId } = await checkCredits(session.user.id, cost);
  if (!hasCredits) {
    return NextResponse.json({ error: "Недостаточно кредитов", balance, cost }, { status: 402 });
  }

  // Build messages
  const messages: { role: string; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  if (context) {
    messages.push({ role: "user", content: `Контекст вселенной:\n${context}\n\nЗадание: ${prompt}` });
  } else {
    messages.push({ role: "user", content: prompt });
  }

  // Add type-specific instructions
  const typeInstructions: Record<string, string> = {
    scenario: "Создай развёрнутый сценарий с несколькими вариантами развития событий. Укажи ключевые конфликты и поворотные моменты.",
    suggestion: "Дай 3-5 кратких предложений по развитию идеи. Каждое предложение — один абзац.",
    edit: "Перепиши текст, улучшив стиль, добавив деталей и устранив противоречия. Сохрани основной смысл.",
    expand: "Расширь описание, добавив детали: атмосферу, историю, особенности, связи с другими элементами мира.",
  };

  if (typeInstructions[type]) {
    messages.push({ role: "system", content: typeInstructions[type] });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

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
      const err = await response.text();
      console.error("OpenRouter error:", err);
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    // Deduct credits after successful generation
    const newBalance = await deductCredits(session.user.id, creditId, cost);

    return NextResponse.json({ text, cost, balance: newBalance });
  } catch (e) {
    console.error("AI generate error:", e);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
