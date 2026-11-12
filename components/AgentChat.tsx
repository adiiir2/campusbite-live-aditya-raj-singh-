"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentResult, AgentStep } from "@/lib/agent/types";

type Message = { role: "user" | "model"; text: string; steps?: AgentStep[] };

// Quick-start requests shown in an empty chat.
const SAMPLE_PROMPTS = [
  "Which urgent deliveries still need a driver?",
  "Assign the pharmacy delivery to the best driver.",
  "Give the furniture delivery to Karthik.",
  "Take Metro Mart off its driver.",
];

export default function AgentChat({ onDataChanged }: { onDataChanged?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Message[] = [...messages, { role: "user", text: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Only the last 20 messages are sent, to keep requests small.
        body: JSON.stringify({ messages: next.slice(-20).map(({ role, text }) => ({ role, text })) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error ?? "The server took too long. Please send it again.");
      const result = data as AgentResult;
      setMessages([...next, { role: "model", text: result.reply, steps: result.steps }]);
      if (result.steps.some((s) => s.writes && s.ok)) onDataChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass fade-up flex h-[72vh] flex-col overflow-hidden rounded-3xl">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <span className="pulse-dot h-2.5 w-2.5 rounded-full bg-fuchsia-400 text-fuchsia-400" />
            Dispatch assistant
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">Type a request. Every lookup and change shows under its reply.</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div className="space-y-2.5">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Quick requests</p>
            {SAMPLE_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="card-hover block w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-slate-200 hover:border-fuchsia-400/40"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`fade-up ${m.role === "user" ? "flex justify-end" : "flex justify-start"}`}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-r from-indigo-500 to-fuchsia-600 px-4 py-2.5 text-sm text-white shadow-lg shadow-fuchsia-900/30"
                  : "max-w-[90%] space-y-2"
              }
            >
              {m.steps && m.steps.length > 0 && <ToolSteps steps={m.steps} />}
              {m.role === "model" ? (
                <div className="whitespace-pre-wrap rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm leading-relaxed text-slate-100">
                  <FormattedText text={m.text} />
                </div>
              ) : (
                m.text
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="typing rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 w-fit">
            <span /><span /><span />
          </div>
        )}
        {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-white/10 p-4"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Send the Adyar grocery order to Ravi"
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-400/20"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="btn-glow rounded-xl px-6 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}

/** Shows **bold** text from Gemini as real bold. Everything else stays plain text. */
function FormattedText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part.replace(/^\* /gm, "• ")}</span>
        )
      )}
    </>
  );
}

/** Shows each tool call so users (and judges) can see what the agent did. */
function ToolSteps({ steps }: { steps: AgentStep[] }) {
  return (
    <div className="space-y-1">
      {steps.map((s, i) => (
        <details key={i} className="rounded-xl border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-slate-300">
          <summary className="cursor-pointer select-none">
            <span className={s.ok ? "text-emerald-400" : "text-red-400"}>{s.ok ? "Done" : "Failed"}</span>
            {" · "}
            <span className="font-mono font-medium">{s.tool}</span>
            {s.writes && <span className="ml-2 rounded bg-amber-400/15 px-1.5 py-0.5 text-amber-300">writes data</span>}
          </summary>
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-slate-400">
            {JSON.stringify({ args: s.args, ...(s.ok ? { result: s.result } : { error: s.error }) }, null, 2)}
          </pre>
        </details>
      ))}
    </div>
  );
}
