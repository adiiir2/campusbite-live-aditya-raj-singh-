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
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  assigned: "bg-blue-50 text-blue-700 ring-blue-200",
  in_transit: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};
const DRIVER_STYLE: Record<string, string> = {
  available: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  on_break: "bg-amber-50 text-amber-700 ring-amber-200",
  off_duty: "bg-slate-100 text-slate-600 ring-slate-200",
};

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
    <div className="card overflow-hidden">
      {/* tabs */}
      <div className="flex border-b border-slate-200">
        {(
          [
            ["deliveries", "Open deliveries", deliveries.length],
            ["drivers", "Drivers", drivers.length],
          ] as const
        ).map(([key, label, n]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 text-sm font-medium ${
              tab === key ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {label}
            <span className={`rounded-full px-2 py-0.5 text-xs ${tab === key ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{n}</span>
          </button>
        ))}
      </div>

      {/* summary */}
      <div className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200 bg-slate-50 text-center">
        {tab === "deliveries" ? (
          <>
            <Stat label="Waiting" value={count("pending")} />
            <Stat label="Assigned" value={count("assigned")} />
            <Stat label="On the road" value={count("in_transit")} />
          </>
        ) : (
          <>
            <Stat label="Available" value={freeDrivers} />
            <Stat label="Busy" value={drivers.filter((d) => d.open > 0).length} />
            <Stat label="Unavailable" value={drivers.length - freeDrivers} />
          </>
        )}
      </div>

      {error && (
        <p className="m-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}.{" "}
          <button onClick={() => setRetry((n) => n + 1)} className="underline">
            Try again
          </button>
        </p>
      )}

      <div className="max-h-[48vh] overflow-y-auto">
        {tab === "deliveries" ? (
          <ul className="divide-y divide-slate-100">
            {!error && deliveries.length === 0 && <li className="p-6 text-center text-sm text-slate-500">No open deliveries.</li>}
            {deliveries.map((d) => (
              <li key={d.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium text-slate-900">
                    #{d.id} · {d.customer}
                    {d.priority === "urgent" && (
                      <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">URGENT</span>
                    )}
                  </p>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs ring-1 ring-inset ${STATUS_STYLE[d.status] ?? ""}`}>
                    {STATUS_LABEL[d.status] ?? d.status}
                  </span>
                </div>
                <p className="truncate text-xs text-slate-500">{d.address}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {d.zone} · {d.weight_kg} kg · Due {d.deadline}
                  {d.driver && <span className="font-medium text-slate-800"> · Driver: {d.driver}</span>}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-slate-100">
            {drivers.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                  {initials(d.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-slate-900">
                      #{d.id} · {d.name}
                    </p>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs ring-1 ring-inset ${DRIVER_STYLE[d.status] ?? ""}`}>
                      {d.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs capitalize text-slate-500">
                    {d.vehicle} · up to {d.capacity_kg} kg · {d.zone}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, (d.open / d.max_active) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-slate-500">
                      {d.open}/{d.max_active} deliveries
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-2 py-2.5">
      <p className="text-xl font-semibold text-slate-900">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}
