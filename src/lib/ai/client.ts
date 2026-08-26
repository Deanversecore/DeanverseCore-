"use client";

/** Set once the server tells us no key is configured, so we stop asking. */
let enhancementAvailable: boolean | null = null;

/**
 * Optional LLM polish over the locally computed answer. It turns itself on as
 * soon as the server has a key, and failures are silent — the deterministic
 * reply is always what the user already has in hand.
 */
export async function enhanceReply(
  utterance: string,
  intent: string,
  reply: string,
): Promise<string | null> {
  if (enhancementAvailable === false) return null;

  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ utterance, intent, reply }),
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      enhanced?: boolean;
      text?: string;
      reason?: string;
    };
    if (payload.reason === "not_configured") {
      enhancementAvailable = false;
      return null;
    }

    enhancementAvailable = true;
    return payload.enhanced && payload.text ? payload.text : null;
  } catch {
    return null;
  }
}
