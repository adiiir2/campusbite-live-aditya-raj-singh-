"use client";

import { useEffect, useState } from "react";

type Delivery = {
  id: number;
  customer: string;
  zone: string;
  weight_kg: number;
  priority: string;
  deadline: string;
  status: string;
  driver: string | null;
};
type Driver = { id: number; name: string; vehicle: string; capacity_kg: number; zone: string; status: string };

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  assigned: "bg-blue-50 text-blue-700",
  in_transit: "bg-emerald-50 text-emerald-700",
};

// Live board: open deliveries and drivers. Reloads when the agent changes data and every 5 seconds.
export default function DispatchBoard({ refreshKey }: { refreshKey: number }) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const count = (s: string) => deliveries.filter((d) => d.status === s).length;

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

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Open deliveries</h2>
          <p className="text-xs text-slate-500">
            {count("pending")} waiting · {count("assigned")} assigned · {count("in_transit")} on the road
          </p>
        </div>
        <ul className="divide-y divide-slate-100">
          {error && (
            <li className="p-4 text-sm text-red-600">
              {error}.{" "}
              <button onClick={() => setRetry((n) => n + 1)} className="underline">
                Try again
              </button>
            </li>
          )}
          {!error && deliveries.length === 0 && <li className="p-4 text-sm text-slate-500">No open deliveries.</li>}
          {deliveries.map((d) => (
            <li key={d.id} className="flex items-start justify-between gap-2 px-4 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="truncate">
                  #{d.id} {d.customer}
                  {d.priority === "urgent" && (
                    <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-700">Urgent</span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {d.zone} · {d.weight_kg} kg · by {d.deadline}
                  {d.driver ? ` · ${d.driver}` : ""}
                </p>
              </div>
              <span className={`shrink-0 rounded px-2 py-0.5 text-xs ${STATUS_STYLE[d.status] ?? "bg-slate-100"}`}>
                {d.status.replace("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Drivers</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {drivers.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate">#{d.id} {d.name}</p>
                <p className="text-xs text-slate-500">
                  {d.vehicle} · {d.capacity_kg} kg · {d.zone}
                </p>
              </div>
              <span
                className={`shrink-0 rounded px-2 py-0.5 text-xs ${
                  d.status === "available" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                }`}
              >
                {d.status.replace("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
