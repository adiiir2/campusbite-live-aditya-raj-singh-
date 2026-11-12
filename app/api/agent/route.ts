import { NextResponse } from "next/server";
import { agentRequestSchema } from "@/lib/schemas";
import { runAgent } from "@/lib/agent/runAgent";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST /api/agent  body: { messages: [{ role: "user" | "model", text: string }] } */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = agentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await runAgent(parsed.data.messages);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Agent failed";
    console.error("[agent]", message);
    const quota = /429|quota|RESOURCE_EXHAUSTED/i.test(message);
    const busy = /503|UNAVAILABLE|high demand|timed out|abort/i.test(message);
    const text = quota
      ? "Too many requests to Gemini. Wait a minute and try again."
      : busy
        ? "Gemini is busy right now. Please send the request again in a few seconds."
        : "Something went wrong while handling that request. Please try again.";
    return NextResponse.json({ error: text }, { status: quota ? 429 : busy ? 503 : 500 });
  }
}
