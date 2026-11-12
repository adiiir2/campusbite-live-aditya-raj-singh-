"use client";

import { useEffect, useState } from "react";

type Delivery = {
  id: number;
  customer: string;
  address: string;
  zone: string;
  weight_kg: number;
  priority: string;
  deadline: string;
  status: string;
  driver: string | null;
};
type Driver = {
  id: number;
  name: string;
  vehicle: string;
  capacity_kg: number;
  zone: string;
  max_active: number;
  status: string;
  open: number;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Waiting",
  assigned: "Assigned",
  in_transit: "On the road",
};
const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-400/10 text-amber-300 ring-amber-400/30",
  assigned: "bg-sky-400/10 text-sky-300 ring-sky-400/30",
  in_transit: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30",
};
const DRIVER_STYLE: Record<string, string> = {
  available: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30",
  on_break: "bg-amber-400/10 text-amber-300 ring-amber-400/30",
  off_duty: "bg-slate-400/10 text-slate-400 ring-slate-400/30",
};
const AVATAR = [
  "from-indigo-500 to-sky-500",
  "from-fuchsia-500 to-rose-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-violet-500 to-indigo-500",
  "from-cyan-500 to-blue-500",
];

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// Live board with two tabs. Reloads when the agent changes data and every 5 seconds.
export default function DispatchBoard({ refreshKey }: { refreshKey: number }) {
  const [tab, setTab] = useState<"deliveries" | "drivers">("deliveries");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const load = () =>
      fetch("/api/dispatch")
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Could not load dispatch data");
          setDeliveries(data.deliveries);
          setDrivers(data.drivers);
          setError("");
        })
        .catch((err) => setError(err.message));
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [refreshKey, retry]);

  const count = (s: string) => deliveries.filter((d) => d.status === s).length;
  const freeDrivers = drivers.filter((d) => d.status === "available").length;

  return (
    <div className="glass fade-up overflow-hidden rounded-3xl">
      {/* tabs */}
      <div className="flex gap-1.5 border-b border-white/10 p-2.5">
        {(
          [
            ["deliveries", "Open deliveries", deliveries.length],
            ["drivers", "Drivers", drivers.length],
          ] as const
        ).map(([key, label, n]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              tab === key ? "btn-glow text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {label}
            <span className={`rounded-full px-2 py-0.5 text-xs ${tab === key ? "bg-white/25 text-white" : "bg-white/10 text-slate-300"}`}>{n}</span>
          </button>
        ))}
      </div>

      {/* glowing stat tiles */}
      <div className="grid grid-cols-3 gap-2.5 p-3">
        {tab === "deliveries" ? (
          <>
            <Stat label="Waiting" value={count("pending")} color="text-amber-300" glow="shadow-amber-500/20" />
            <Stat label="Assigned" value={count("assigned")} color="text-sky-300" glow="shadow-sky-500/20" />
            <Stat label="On the road" value={count("in_transit")} color="text-emerald-300" glow="shadow-emerald-500/20" />
          </>
        ) : (
          <>
            <Stat label="Available" value={freeDrivers} color="text-emerald-300" glow="shadow-emerald-500/20" />
            <Stat label="Busy" value={drivers.filter((d) => d.open > 0).length} color="text-sky-300" glow="shadow-sky-500/20" />
            <Stat label="Unavailable" value={drivers.length - freeDrivers} color="text-slate-300" glow="shadow-slate-500/10" />
          </>
        )}
      </div>

      {error && (
        <p className="mx-3 mb-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}.{" "}
          <button onClick={() => setRetry((n) => n + 1)} className="underline">
            Try again
          </button>
        </p>
      )}

      <div className="max-h-[46vh] space-y-2.5 overflow-y-auto px-3 pb-3">
        {tab === "deliveries" ? (
          <>
            {!error && deliveries.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No open deliveries.</p>}
            {deliveries.map((d) => (
              <div key={d.id} className="card-hover fade-up flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                <span
                  className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                    d.priority === "urgent" ? "pulse-dot bg-red-500 text-red-500" : "bg-slate-600"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-white">
                      #{d.id} · {d.customer}
                    </p>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs ring-1 ring-inset ${STATUS_STYLE[d.status] ?? ""}`}>
                      {STATUS_LABEL[d.status] ?? d.status}
                    </span>
                  </div>
                  <p className="truncate text-xs text-slate-400">{d.address}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <Chip>{d.zone}</Chip>
                    <Chip>{d.weight_kg} kg</Chip>
                    <Chip>Due {d.deadline}</Chip>
                    {d.priority === "urgent" && <span className="rounded-md bg-red-500/15 px-2 py-0.5 font-semibold text-red-300">URGENT</span>}
                    {d.driver && <span className="rounded-md bg-fuchsia-500/15 px-2 py-0.5 font-medium text-fuchsia-300">{d.driver}</span>}
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          drivers.map((d, i) => (
            <div key={d.id} className="card-hover fade-up flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-sm font-bold text-white ${AVATAR[i % AVATAR.length]}`}>
                {initials(d.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-white">
                    #{d.id} · {d.name}
                  </p>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs ring-1 ring-inset ${DRIVER_STYLE[d.status] ?? ""}`}>
                    {d.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs capitalize text-slate-400">
                  {d.vehicle} · up to {d.capacity_kg} kg · {d.zone}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400 transition-all duration-700"
                      style={{ width: `${Math.min(100, (d.open / d.max_active) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {d.open}/{d.max_active}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md bg-white/[0.07] px-2 py-0.5 text-slate-300">{children}</span>;
}

function Stat({ label, value, color, glow }: { label: string; value: number; color: string; glow: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-3 text-center shadow-lg ${glow}`}>
      <p className={`text-3xl font-extrabold leading-none ${color}`}>{value}</p>
      <p className="mt-1.5 text-[10px] font-medium uppercase tracking-widest text-slate-400">{label}</p>
    </div>
  );
}
