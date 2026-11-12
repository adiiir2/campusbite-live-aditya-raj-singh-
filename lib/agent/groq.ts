import "server-only";
import { z } from "zod";
import { tools } from "./tools";
import { buildSystemPrompt } from "./systemPrompt";
import type { ChatMessage } from "../schemas";
import type { AgentResult, AgentStep } from "./types";

/*
 * BACKUP MODEL (Groq). Used only when Gemini is busy, out of quota or its key fails.
 * It uses the same tools, the same Zod checks and the same database functions.
 */
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b";
const MAX_ROUNDS = 6;

export const groqAvailable = () => Boolean(process.env.GROQ_API_KEY?.trim());

type GroqMessage =
  | { role: "system" | "user" | "assistant"; content: string | null; tool_calls?: GroqToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };
type GroqToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

// Tool list in the format Groq expects.
const groqTools = tools.map((t) => {
  const { $schema: _ignored, ...parameters } = z.toJSONSchema(t.schema, { io: "input" }) as {
    $schema?: string;
    properties?: Record<string, { type?: string | string[] }>;
    required?: string[];
  };
  // This model sends null for filters it does not use, so allow null on optional fields.
  for (const [key, prop] of Object.entries(parameters.properties ?? {})) {
    if (!(parameters.required ?? []).includes(key) && typeof prop.type === "string") prop.type = [prop.type, "null"];
  }
  return { type: "function", function: { name: t.name, description: t.description, parameters } };
});

// Smaller models sometimes send numbers as text ("5"). Turn them back into numbers.
function fixNumbers(toolName: string, args: Record<string, unknown>): Record<string, unknown> {
  const tool = tools.find((t) => t.name === toolName);
  if (!tool) return args;
  const props = (z.toJSONSchema(tool.schema, { io: "input" }) as { properties?: Record<string, { type?: string }> }).properties ?? {};
  const out = { ...args };
  for (const key of Object.keys(out)) if (out[key] === null) delete out[key]; // null = "not given"
  for (const [key, value] of Object.entries(out)) {
    if (props[key]?.type !== "string" && typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
      out[key] = Number(value);
    }
  }
  return out;
}

export async function runGroqAgent(
  messages: ChatMessage[],
  runTool: (name: string, args: unknown) => Promise<AgentStep>
): Promise<AgentResult> {
  const steps: AgentStep[] = [];
  const convo: GroqMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    ...messages.map((m): GroqMessage => ({ role: m.role === "model" ? "assistant" : "user", content: m.text })),
  ];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const send = () =>
      fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY!.trim()}` },
        body: JSON.stringify({ model: GROQ_MODEL, messages: convo, tools: groqTools, tool_choice: "auto", temperature: 0.2 }),
        signal: AbortSignal.timeout(25_000),
      });
    let res = await send();
    // The free tier limits tokens per minute. Wait a few seconds and try once more.
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 6000));
      res = await send();
    }
    if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { choices: { message: { content: string | null; tool_calls?: GroqToolCall[] } }[] };
    const msg = data.choices[0].message;
    const calls = msg.tool_calls ?? [];

    // No tool requested: this is the final answer.
    if (calls.length === 0) {
      return { reply: msg.content?.trim() || "Sorry, I could not answer that.", steps };
    }

    convo.push({ role: "assistant", content: msg.content, tool_calls: calls });
    for (const call of calls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        /* bad JSON: Zod will report the missing fields */
      }
      const step = await runTool(call.function.name, fixNumbers(call.function.name, args));
      steps.push(step);
      convo.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(step.ok ? { result: step.result } : { error: step.error }) });
    }
  }
  return { reply: "I needed too many steps for this request. Please try a simpler or more specific question.", steps };
}
