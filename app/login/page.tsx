"use client";

import { useState } from "react";

export default function LoginPage() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    setLoading(false);
    if (res.ok) {
      window.location.href = "/";
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Login failed");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="glass fade-up w-full max-w-sm rounded-3xl p-8">
        <span className="btn-glow flex h-14 w-14 items-center justify-center rounded-2xl">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
            <circle cx="7" cy="18" r="1.6" />
            <circle cx="17" cy="18" r="1.6" />
          </svg>
        </span>
        <h1 className="gradient-text mt-5 text-3xl font-extrabold tracking-tight">DispatchIQ</h1>
        <p className="mt-1 text-sm text-slate-400">Enter the passcode to open the dispatch console.</p>
        <input
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="mt-6 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-500 focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-400/20"
          placeholder="Passcode"
          autoFocus
        />
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || !passcode}
          className="btn-glow mt-4 w-full rounded-xl px-3 py-3 font-semibold text-white disabled:opacity-40"
        >
          {loading ? "Checking..." : "Enter console"}
        </button>
      </form>
    </main>
  );
}
