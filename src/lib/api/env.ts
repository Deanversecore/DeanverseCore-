export type AiEnv = {
  AI_API_KEY?: string;
  OPENAI_API_KEY?: string;
  AI_BASE_URL?: string;
  AI_MODEL?: string;
  AI_TTS_MODEL?: string;
  AI_TTS_VOICE?: string;
};

export function aiKey(env: AiEnv): string | undefined {
  return env.AI_API_KEY ?? env.OPENAI_API_KEY;
}
