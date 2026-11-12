"use client";

import { useState } from "react";
import AgentChat from "@/components/AgentChat";
import DispatchBoard from "@/components/DispatchBoard";

// Left: the agent chat. Right: the live dispatch board.
export default function HomePage() {
  // Changes every time the agent writes data, so the board reloads.
  const [refreshKey, setRefreshKey] = useState(0);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 pt-4 md:px-6">
      <header className="glass fade-up mb-5 overflow-hidden rounded-3xl px-5 pb-4 pt-5 md:px-7">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="btn-glow flex h-12 w-12 items-center justify-center rounded-2xl">
              <TruckIcon className="h-6 w-6" />
            </span>
            <div>
              <h1 className="gradient-text text-2xl font-extrabold leading-tight tracking-tight md:text-3xl">DispatchIQ</h1>
              <p className="text-xs text-slate-400 md:text-sm">Chennai Central Depot · Dispatcher: Meera Nair</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300 sm:flex">
              <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-400 text-emerald-400" /> Live
            </span>
            <button onClick={logout} className="rounded-xl border border-white/15 px-3.5 py-1.5 text-xs text-slate-300 transition hover:bg-white/10">
              Log out
            </button>
          </div>
        </div>
        <div className="road mt-6">
          <TruckIcon className="truck h-7 w-7 text-fuchsia-300" />
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <AgentChat onDataChanged={() => setRefreshKey((k) => k + 1)} />
        </section>
        <section className="lg:col-span-2">
          <DispatchBoard refreshKey={refreshKey} />
        </section>
      </div>
    </main>
  );
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="17" cy="18" r="1.6" />
    </svg>
  );
}
