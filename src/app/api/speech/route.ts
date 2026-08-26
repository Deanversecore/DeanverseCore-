import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_CHARACTERS = 1200;

function config() {
  const apiKey = process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY;
  return {
    apiKey,
    baseUrl: process.env.AI_BASE_URL ?? "https://api.openai.com/v1",
    model: process.env.AI_TTS_MODEL ?? "gpt-4o-mini-tts",
    voice: process.env.AI_TTS_VOICE ?? "alloy",
  };
}

/** Lets the client know whether to expect a real voice or use the device's own. */
export async function GET() {
  const { apiKey, voice } = config();
  return NextResponse.json({ available: Boolean(apiKey), voice: apiKey ? voice : null });
}

export async function POST(request: Request) {
  const { apiKey, baseUrl, model, voice } = config();
  if (!apiKey) {
    return NextResponse.json({ available: false, reason: "not_configured" }, { status: 503 });
  }

  let text: string;
  try {
    ({ text } = (await request.json()) as { text: string });
  } catch {
    return NextResponse.json({ reason: "bad_request" }, { status: 400 });
  }

  if (!text?.trim()) {
    return NextResponse.json({ reason: "bad_request" }, { status: 400 });
  }

  try {
    const response = await fetch(`${baseUrl}/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        voice,
        input: text.slice(0, MAX_CHARACTERS),
        response_format: "mp3",
        instructions:
          "Speak like a calm, competent executive assistant: measured pace, warm, no theatrics.",
      }),
    });

    if (!response.ok || !response.body) {
      return NextResponse.json({ reason: "upstream_error" }, { status: 502 });
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ reason: "network_error" }, { status: 502 });
  }
}
