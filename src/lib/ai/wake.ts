export const ASSISTANT_NAME = "Core";

/** Speech engines often hear "Core" as one of these. */
const WAKE_TOKEN = String.raw`(?:core|kor|kore|corps|corey|cory)`;
const WAKE_PREFIX = String.raw`(?:hey|hi|hello|ok|okay|yo)\s+`;

const WAKE_WORD_RE = new RegExp(`\\b(?:${WAKE_PREFIX})?${WAKE_TOKEN}\\b`, "i");
const LEADING_WAKE_RE = new RegExp(`^(?:${WAKE_PREFIX})?${WAKE_TOKEN}\\b[,.!?\\s]*`, "i");

export function hasWakeWord(text: string): boolean {
  return WAKE_WORD_RE.test(text);
}

export function stripWakeWord(text: string): string {
  return text
    .replace(LEADING_WAKE_RE, "")
    .replace(/^[,.!?]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isWakeOnly(text: string): boolean {
  return hasWakeWord(text) && !stripWakeWord(text);
}

export type VoiceTurn = { kind: "ignore" } | { kind: "wake" } | { kind: "command"; command: string };

export function resolveVoiceTurn(transcript: string): VoiceTurn {
  const text = transcript.replace(/\s+/g, " ").trim();
  if (!text) return { kind: "ignore" };
  if (!hasWakeWord(text)) return { kind: "ignore" };
  const command = stripWakeWord(text);
  if (!command) return { kind: "wake" };
  return { kind: "command", command };
}
