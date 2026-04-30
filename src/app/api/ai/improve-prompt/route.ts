import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkCredits, deductCredits } from "@/lib/credits";
import { validateBody, improvePromptSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.0-flash-001";
const COST = 0.5;

const SYSTEM_PROMPT = `Ты — ассистент для улучшения промптов пользователя. 
На основе краткого описания пользователя и контекста вселенной, создай более детальный и конкретный промпт для генерации сущностей.
Добавь конкретные детали, имена, отношения, атмосферу — то, что сделает генерацию более интересной.
Отвечай ТОЛЬКО улучшенным промптом, без пояснений, без кавычек, без markdown.`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(session.user.id, "ai");
  if (rl) return rl;

  const body = await req.json();
  const parsed = validateBody(improvePromptSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { prompt, context } = parsed.data;

  // Check credits
  const { ok: hasCredits, balance, creditId } = await checkCredits(session.user.id, COST);
  if (!hasCredits) {
    return NextResponse.json({ error: "Недостаточно кредитов", balance, cost: COST }, { status: 402 });
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
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Контекст вселенной: ${context || "нет"}\n\nПромпт пользователя: ${prompt.trim()}` },
        ],
        max_tokens: 500,
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      console.error("OpenRouter improve-prompt error:", await response.text());
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }

    const data = await response.json();
    const improved = data.choices?.[0]?.message?.content?.trim() || prompt.trim();

    // Deduct credits
    const newBalance = await deductCredits(session.user.id, creditId, COST);

    return NextResponse.json({ improved, cost: COST, balance: newBalance });
  } catch (e) {
    console.error("AI improve-prompt error:", e);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
