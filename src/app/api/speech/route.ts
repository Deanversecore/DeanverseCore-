import { handleSpeech, handleSpeechStatus } from "@/lib/api/tts";

export const runtime = "nodejs";

export async function GET() {
  return handleSpeechStatus(process.env);
}

export async function POST(request: Request) {
  return handleSpeech(request, process.env);
}
