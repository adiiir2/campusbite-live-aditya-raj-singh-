import "server-only";
import type { Content, Part } from "@google/genai";
import { getGemini } from "../gemini";
import { GEMINI_MODEL } from "../env";
import type { ChatMessage } from "../schemas";
import { tools } from "./tools";
import { toFunctionDeclarations } from "./defineTool";
import { buildSystemPrompt } from "./systemPrompt";
import type { AgentResult, AgentStep } from "./types";
import { groqAvailable, runGroqAgent } from "./groq";

/** Stops the agent from looping forever and using up your Gemini quota. */
const MAX_ROUNDS = 8;

/**
 * THE AGENT LOOP
 * 1. Send the chat + the tool list to Gemini.
 * 2. If Gemini asks for tools, check the arguments with Zod and run them.
 * 3. Send the results back to Gemini.
 * 4. Repeat until Gemini gives a final text answer (or MAX_ROUNDS is reached).
 */

// Gemini sometimes answers 503 "high demand". Try once more, then let the backup model answer.
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!/503|UNAVAILABLE|timed out|abort/i.test(String(err))) throw err;
    return await fn();
  }
}

/** Gemini first. If it fails (busy, quota, bad key), the backup model answers with the same tools. */
export async function runAgent(messages: ChatMessage[]): Promise<AgentResult> {
  const steps: AgentStep[] = [];
  try {
    return await runGeminiAgent(messages, steps);
  } catch (err) {
    console.error("[agent] Gemini failed:", String(err).slice(0, 200));
    if (!groqAvailable()) throw err;

    // A change that already went through must not be repeated by the backup.
    if (steps.some((s) => s.writes && s.ok)) {
      return { reply: "The change went through (see the tool details above), but I could not write the summary because the AI service failed.", steps };
    }
    return await runGroqAgent(messages, runTool);
  }
}

async function runGeminiAgent(messages: ChatMessage[], steps: AgentStep[]): Promise<AgentResult> {
  const ai = getGemini();
  const functionDeclarations = toFunctionDeclarations(tools);

  const contents: Content[] = messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await withRetry(() => ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: buildSystemPrompt(),
        tools: [{ functionDeclarations }],
        temperature: 0.2,
        httpOptions: { timeout: 12_000 },
      },
    }));

    const calls = response.functionCalls ?? [];

    // No tool requested: this is the final answer.
    if (calls.length === 0) {
      return { reply: response.text?.trim() || "Sorry, I could not answer that.", steps };
    }

    // Keep Gemini's own turn (it carries the tool request) in the history.
    const modelTurn = response.candidates?.[0]?.content;
    if (modelTurn) contents.push(modelTurn);

    const responseParts: Part[] = [];
    for (const call of calls) {
      const step = await runTool(call.name ?? "", call.args ?? {});
      steps.push(step);
      responseParts.push({
        functionResponse: {
          id: call.id,
          name: call.name,
          response: step.ok ? { result: step.result } : { error: step.error },
        },
      });
    }
    contents.push({ role: "user", parts: responseParts });
  }

  return {
    reply: "I needed too many steps for this request. Please try a simpler or more specific question.",
    steps,
  };
}

async function runTool(name: string, rawArgs: unknown): Promise<AgentStep> {
  const tool = tools.find((t) => t.name === name);
  if (!tool) {
    return { tool: name, args: rawArgs, ok: false, writes: false, error: `Unknown tool: ${name}` };
  }

  // Never trust the model's arguments: check them with Zod first.
  const parsed = tool.schema.safeParse(rawArgs);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => `${i.path.join(".") || "args"}: ${i.message}`).join("; ");
    return { tool: name, args: rawArgs, ok: false, writes: tool.writes, error: `Invalid arguments: ${message}` };
  }

  try {
    const result = await tool.run(parsed.data);
    return { tool: name, args: parsed.data, ok: true, writes: tool.writes, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool failed";
    console.error(`[tool ${name}]`, message); // shows tool errors in the terminal
    return { tool: name, args: parsed.data, ok: false, writes: tool.writes, error: message };
  }
}
