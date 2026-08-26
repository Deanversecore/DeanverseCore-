import { handleEnhance } from "../src/lib/api/enhance";
import { handleSpeech, handleSpeechStatus } from "../src/lib/api/tts";
import type { AiEnv } from "../src/lib/api/env";

export interface Env extends AiEnv {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/ai" && request.method === "POST") {
      return handleEnhance(request, env);
    }

    if (pathname === "/api/speech" && request.method === "GET") {
      return handleSpeechStatus(env);
    }

    if (pathname === "/api/speech" && request.method === "POST") {
      return handleSpeech(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
