import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkCredits, deductCredits } from "@/lib/credits";
import { validateBody, generateImageSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Image generation costs more credits
const IMAGE_CREDIT_COST = 10;

// Best image models on OpenRouter (April 2026):
// - google/gemini-3.1-flash-image-preview (Nano Banana 2): $0.50/$3.00 — best quality/price, text+image output
// - openai/gpt-5-image-mini: $2.50/$2.00 — good but expensive
// - black-forest-labs/flux.2-klein-4b: free but image-only output
// - sourceful/riverflow-v2-fast: free, good for text rendering
const IMAGE_MODEL = "google/gemini-3.1-flash-image-preview";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(session.user.id, "ai");
  if (rl) return rl;

  const body = await req.json();
  const parsed = validateBody(generateImageSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { prompt, aspectRatio, context, entityName, entityDescription } = parsed.data;

  // Build prompt: use provided prompt, or auto-generate from entity info
  let finalPrompt = prompt || "";
  if (!finalPrompt && entityName) {
    finalPrompt = `Illustration of ${entityName}${entityDescription ? `: ${entityDescription.slice(0, 200)}` : ""}`;
  }
  if (!finalPrompt) {
    return NextResponse.json({ error: "prompt or entity info required" }, { status: 400 });
  }

  // Check credits
  const { ok: hasCredits, balance, creditId } = await checkCredits(session.user.id, IMAGE_CREDIT_COST);
  if (!hasCredits) {
    return NextResponse.json({ error: "Недостаточно кредитов", balance, cost: IMAGE_CREDIT_COST }, { status: 402 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  try {
    const imageConfig: Record<string, string> = {};
    if (aspectRatio) imageConfig.aspect_ratio = aspectRatio;

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://canonix.app",
        "X-OpenRouter-Title": "Canonix",
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        messages: [
          {
            role: "user",
            content: `Generate an illustration for a fictional universe: ${finalPrompt}. Style: atmospheric, detailed, cinematic lighting.${context ? ` Context: ${context}` : ""}`,
          },
        ],
        modalities: ["image", "text"],
        ...(Object.keys(imageConfig).length > 0 && { image_config: imageConfig }),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenRouter image error:", err);
      return NextResponse.json({ error: "AI image service error" }, { status: 502 });
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;

    // Extract image from response
    let imageUrl: string | null = null;
    if (message?.content) {
      // Some models return base64 in content
      for (const part of Array.isArray(message.content) ? message.content : [message.content]) {
        if (typeof part === "object" && part.type === "image_url") {
          imageUrl = part.image_url?.url || null;
          break;
        }
      }
    }
    // Also check images array
    if (!imageUrl && message?.images?.[0]?.image_url?.url) {
      imageUrl = message.images[0].image_url.url;
    }

    if (!imageUrl) {
      // If no image was generated, don't charge credits
      return NextResponse.json({ error: "Не удалось сгенерировать изображение" }, { status: 502 });
    }

    // Deduct credits after successful generation
    const newBalance = await deductCredits(session.user.id, creditId, IMAGE_CREDIT_COST);

    return NextResponse.json({ imageUrl, cost: IMAGE_CREDIT_COST, balance: newBalance });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Insufficient credits") {
      return NextResponse.json({ error: "Недостаточно кредитов" }, { status: 402 });
    }
    console.error("AI image generate error:", e);
    return NextResponse.json({ error: "AI image generation failed" }, { status: 500 });
  }
}
