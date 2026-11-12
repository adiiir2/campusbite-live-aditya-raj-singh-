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
    <main className="mx-auto max-w-6xl p-4 md:p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">DispatchIQ · delivery dispatch agent</h1>
          <p className="text-sm text-slate-500">Tell the agent which delivery goes to which driver.</p>
        </div>
        <button onClick={logout} className="text-sm text-slate-500 hover:text-slate-900">
          Log out
        </button>
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
