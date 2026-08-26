import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are DeanVerse, a real personal assistant talking out loud to someone you work with every day.
You will be given facts a planning engine already produced. Say them the way a sharp, warm person in the room would say them — not like a chatbot reading a report.
Rules:
- Never invent tasks, dates, names, or numbers that are not in the payload.
- Short sentences. Contractions. First person.
- No markdown, bullets, numbered lists, emoji, or "as an AI".
- Stay under 80 words unless the payload is a multi-day plan, then 120.
- If the payload has several items, weave them into speech ("first… then… and finally…").`;

interface EnhanceRequest {
  intent: string;
  reply: string;
  utterance: string;
}

/**
 * Optional enhancement layer. The client always computes its answer locally, so
 * the assistant works with zero configuration and no data leaves the device.
 * When an API key is present this endpoint restyles that answer with an LLM.
 */
export async function POST(request: Request) {
  const apiKey = process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ enhanced: false, reason: "not_configured" });
  }

  let body: EnhanceRequest;
  try {
    body = (await request.json()) as EnhanceRequest;
  } catch {
    return NextResponse.json({ enhanced: false, reason: "bad_request" }, { status: 400 });
  }

  if (!body?.reply) {
    return NextResponse.json({ enhanced: false, reason: "bad_request" }, { status: 400 });
  }

  const baseUrl = process.env.AI_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.AI_MODEL ?? "gpt-4o-mini";

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `User said: ${body.utterance}\nDetected intent: ${body.intent}\n\nEngine answer:\n${body.reply}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ enhanced: false, reason: "upstream_error" });
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = payload.choices?.[0]?.message?.content?.trim();

    return text
      ? NextResponse.json({ enhanced: true, text })
      : NextResponse.json({ enhanced: false, reason: "empty_response" });
  } catch {
    return NextResponse.json({ enhanced: false, reason: "network_error" });
  }
}
