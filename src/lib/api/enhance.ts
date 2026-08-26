import { aiKey, type AiEnv } from "./env";

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

export async function handleEnhance(request: Request, env: AiEnv): Promise<Response> {
  const apiKey = aiKey(env);
  if (!apiKey) {
    return Response.json({ enhanced: false, reason: "not_configured" });
  }

  let body: EnhanceRequest;
  try {
    body = (await request.json()) as EnhanceRequest;
  } catch {
    return Response.json({ enhanced: false, reason: "bad_request" }, { status: 400 });
  }

  if (!body?.reply) {
    return Response.json({ enhanced: false, reason: "bad_request" }, { status: 400 });
  }

  const baseUrl = env.AI_BASE_URL ?? "https://api.openai.com/v1";
  const model = env.AI_MODEL ?? "gpt-4o-mini";

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
      return Response.json({ enhanced: false, reason: "upstream_error" });
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = payload.choices?.[0]?.message?.content?.trim();

    return text
      ? Response.json({ enhanced: true, text })
      : Response.json({ enhanced: false, reason: "empty_response" });
  } catch {
    return Response.json({ enhanced: false, reason: "network_error" });
  }
}
