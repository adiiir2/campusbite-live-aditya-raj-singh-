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
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-lg">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
            <circle cx="7" cy="18" r="1.6" />
            <circle cx="17" cy="18" r="1.6" />
          </svg>
        </span>
        <h1 className="mt-4 text-xl font-bold tracking-tight">DispatchIQ</h1>
        <p className="mt-1 text-sm text-slate-500">Enter the passcode to open the dispatch console.</p>
        <input
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="mt-5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          placeholder="Passcode"
          autoFocus
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || !passcode}
          className="mt-4 w-full rounded-xl bg-indigo-600 px-3 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Checking..." : "Enter"}
        </button>
      </form>
    </main>
  );
}
