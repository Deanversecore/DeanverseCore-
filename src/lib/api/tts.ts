import { aiKey, type AiEnv } from "./env";

const MAX_CHARACTERS = 1200;

function config(env: AiEnv) {
  const apiKey = aiKey(env);
  return {
    apiKey,
    baseUrl: env.AI_BASE_URL ?? "https://api.openai.com/v1",
    model: env.AI_TTS_MODEL ?? "gpt-4o-mini-tts",
    voice: env.AI_TTS_VOICE ?? "alloy",
  };
}

export function handleSpeechStatus(env: AiEnv): Response {
  const { apiKey, voice } = config(env);
  return Response.json({ available: Boolean(apiKey), voice: apiKey ? voice : null });
}

export async function handleSpeech(request: Request, env: AiEnv): Promise<Response> {
  const { apiKey, baseUrl, model, voice } = config(env);
  if (!apiKey) {
    return Response.json({ available: false, reason: "not_configured" }, { status: 503 });
  }

  let text: string;
  try {
    ({ text } = (await request.json()) as { text: string });
  } catch {
    return Response.json({ reason: "bad_request" }, { status: 400 });
  }

  if (!text?.trim()) {
    return Response.json({ reason: "bad_request" }, { status: 400 });
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
          "Speak like a real person in the room, not a narrator. Warm, present, conversational. Natural pace with slight energy. Never sound like you are reading a document.",
      }),
    });

    if (!response.ok || !response.body) {
      return Response.json({ reason: "upstream_error" }, { status: 502 });
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ reason: "network_error" }, { status: 502 });
  }
}
