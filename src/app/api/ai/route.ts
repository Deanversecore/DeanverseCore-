import { handleEnhance } from "@/lib/api/enhance";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleEnhance(request, process.env);
}
