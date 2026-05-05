import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkCredits, deductCredits } from "@/lib/credits";
import { validateBody, translateSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.0-flash-001";
const COST = 0.5;

const LANG_NAMES: Record<string, string> = {
  en: "English",
  ru: "русский",
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(session.user.id, "ai");
  if (rl) return rl;

  const body = await req.json();
  const parsed = validateBody(translateSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { targetLang, name, description, fields, fieldNames } = parsed.data;

  // Check credits
  const { ok: hasCredits, balance, creditId } = await checkCredits(session.user.id, COST);
  if (!hasCredits) {
    return NextResponse.json({ error: "Недостаточно кредитов", balance, cost: COST }, { status: 402 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  const safeFields = fields || {};
  const fieldsToTranslate = fieldNames
    ?.filter((f: string) => safeFields[f.toLowerCase()] || safeFields[f])
    ?.map((f: string) => ({ key: f, value: safeFields[f.toLowerCase()] || safeFields[f] })) || [];

  const prompt = `Translate the following entity card content to ${LANG_NAMES[targetLang] || targetLang}.
Keep proper nouns (names of people, places) in their original form unless they have a well-known translation.
Translate descriptions naturally, preserving the tone and meaning.

Name: ${name}
${description ? `Description: ${description}` : ""}
${fieldsToTranslate.length > 0 ? `Fields:\n${fieldsToTranslate.map((f: { key: string; value: string }) => `- ${f.key}: ${f.value}`).join("\n")}` : ""}

Respond ONLY with valid JSON (no markdown, no comments):
{
  "name": "translated name",
  "description": "translated description",
  "fields": { "field_key_lowercase": "translated value" }
}`;

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
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error("OpenRouter translate error:", await response.text());
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const cleaned = text.replace(/```json\s*|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "AI вернул невалидный JSON", raw: text }, { status: 422 });
    }

    // Deduct credits
    const newBalance = await deductCredits(session.user.id, creditId, COST);

    return NextResponse.json({
      name: parsed.name || name,
      description: parsed.description || description,
      fields: parsed.fields || {},
      cost: COST,
      balance: newBalance,
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Insufficient credits") {
      return NextResponse.json({ error: "Недостаточно кредитов" }, { status: 402 });
    }
    console.error("AI translate error:", e);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
