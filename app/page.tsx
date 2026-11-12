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
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <TruckIcon className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-base font-semibold leading-tight text-slate-900">DispatchIQ</h1>
              <p className="text-xs text-slate-500">Chennai Central Depot</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-slate-600 sm:block">Dispatcher: Meera Nair</span>
            <button onClick={logout} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 md:px-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Dispatch console</h2>
          <p className="text-sm text-slate-500">Assign deliveries to drivers by typing a request, and watch the board update.</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-5">
          <section className="lg:col-span-3">
            <AgentChat onDataChanged={() => setRefreshKey((k) => k + 1)} />
          </section>
          <section className="lg:col-span-2">
            <DispatchBoard refreshKey={refreshKey} />
          </section>
        </div>
      </main>
    </div>
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
