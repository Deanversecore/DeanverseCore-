"use client";

const ENHANCEMENT_ENABLED = process.env.NEXT_PUBLIC_AI_ENHANCE === "1";

/**
 * Optional LLM polish over the locally computed answer. Failures are silent —
 * the deterministic reply is always what the user already has in hand.
 */
export async function enhanceReply(
  utterance: string,
  intent: string,
  reply: string,
): Promise<string | null> {
  if (!ENHANCEMENT_ENABLED) return null;

  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ utterance, intent, reply }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { enhanced?: boolean; text?: string };
    return payload.enhanced && payload.text ? payload.text : null;
  } catch {
    return null;
  }
}
