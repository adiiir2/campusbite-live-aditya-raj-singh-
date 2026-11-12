"use client";

import { useState } from "react";
import AgentChat from "@/components/AgentChat";
import DispatchBoard from "@/components/DispatchBoard";

// Left: the agent chat. Right: the live dispatch board.
export default function HomePage() {
  // Changes every time the agent writes data, so the list on the right reloads.
  const [refreshKey, setRefreshKey] = useState(0);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-8 md:px-6">
      <header className="-mx-4 mb-5 bg-slate-900 px-4 py-4 text-white md:mx-0 md:mt-4 md:rounded-2xl md:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
                <circle cx="7" cy="18" r="1.6" />
                <circle cx="17" cy="18" r="1.6" />
              </svg>
            </span>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight">DispatchIQ</h1>
              <p className="text-xs text-slate-300">Chennai Central Depot · Dispatcher: Meera Nair</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-xs text-emerald-300 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Live
            </span>
            <button onClick={logout} className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10">
              Log out
            </button>
          </div>
        </div>
      </header>
      <div className="grid gap-4 md:grid-cols-5">
        <section className="md:col-span-3">
          <AgentChat onDataChanged={() => setRefreshKey((k) => k + 1)} />
        </section>
        <section className="md:col-span-2">
          <DispatchBoard refreshKey={refreshKey} />
        </section>
      </div>
    </main>
  );
}
