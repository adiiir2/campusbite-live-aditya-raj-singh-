import "server-only";
import { z } from "zod";
import { defineTool, type AgentTool } from "./defineTool";
import { getSupabase } from "../supabase";
import { CURRENT_USER_ID, formatTime } from "../currentUser";

// Supabase may return a joined row as an object or a one-item array.
function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

// ---------------------------------------------------------------- read tools

const getPendingDeliveries = defineTool({
  name: "getPendingDeliveries",
  description:
    "Use this when the dispatcher wants to see deliveries that still need a driver. Optional zone filter. Urgent first, then earliest deadline.",
  schema: z.object({
    zone: z.string().optional().describe("Area name, for example 'T Nagar', 'Adyar' or 'Guindy'"),
  }),
  run: async ({ zone }) => {
    let q = getSupabase()
      .from("deliveries")
      .select("id, customer, address, zone, weight_kg, priority, deadline")
      .eq("dispatcher_id", CURRENT_USER_ID)
      .eq("status", "pending")
      .order("deadline", { ascending: true })
      .limit(20);
    if (zone) q = q.ilike("zone", zone);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows = data
      .map((d) => ({ ...d, deadline: formatTime(d.deadline) }))
      .sort((a, b) => Number(b.priority === "urgent") - Number(a.priority === "urgent"));
    return { count: rows.length, deliveries: rows };
  },
});

const getAvailableDrivers = defineTool({
  name: "getAvailableDrivers",
  description:
    "Use this when the dispatcher asks which drivers are free, or before assigning a delivery. Shows each driver's zone, vehicle, capacity and open deliveries.",
  schema: z.object({
    zone: z.string().optional().describe("Only drivers covering this area"),
    min_capacity_kg: z.number().int().positive().optional().describe("Only vehicles that can carry at least this many kg"),
  }),
  run: async ({ zone, min_capacity_kg }) => {
    let q = getSupabase()
      .from("drivers")
      .select("id, name, vehicle, capacity_kg, zone, max_active, status")
      .eq("dispatcher_id", CURRENT_USER_ID)
      .eq("status", "available")
      .limit(20);
    if (zone) q = q.ilike("zone", zone);
    if (min_capacity_kg) q = q.gte("capacity_kg", min_capacity_kg);
    const { data: drivers, error } = await q;
    if (error) throw new Error(error.message);

    // count open deliveries per driver
    const { data: open, error: e2 } = await getSupabase()
      .from("deliveries")
      .select("driver_id")
      .eq("dispatcher_id", CURRENT_USER_ID)
      .in("status", ["assigned", "in_transit"]);
    if (e2) throw new Error(e2.message);
    const load = new Map<number, number>();
    for (const o of open) load.set(o.driver_id, (load.get(o.driver_id) ?? 0) + 1);

    const rows = drivers.map((d) => ({
      ...d,
      open_deliveries: load.get(d.id) ?? 0,
      has_room: (load.get(d.id) ?? 0) < d.max_active,
    }));
    return { count: rows.length, drivers: rows };
  },
});

const getMyDispatches = defineTool({
  name: "getMyDispatches",
  description:
    "Use this when the dispatcher wants to see deliveries already given to drivers (assigned or on the road), or what one driver is carrying.",
  schema: z.object({
    driver_name: z.string().optional().describe("Part of a driver's name to filter by"),
  }),
  run: async ({ driver_name }) => {
    const { data, error } = await getSupabase()
      .from("deliveries")
      .select("id, customer, zone, weight_kg, priority, deadline, status, drivers(name)")
      .eq("dispatcher_id", CURRENT_USER_ID)
      .in("status", ["assigned", "in_transit"])
      .order("deadline", { ascending: true })
      .limit(20);
    if (error) throw new Error(error.message);
    let rows = data.map((d) => ({
      id: d.id,
      customer: d.customer,
      zone: d.zone,
      weight_kg: d.weight_kg,
      priority: d.priority,
      deadline: formatTime(d.deadline),
      status: d.status,
      driver: one(d.drivers)?.name ?? null,
    }));
    if (driver_name) rows = rows.filter((r) => r.driver?.toLowerCase().includes(driver_name.toLowerCase()));
    return { count: rows.length, deliveries: rows };
  },
});

// ---------------------------------------------------------------- write tools
// The database functions check every business rule and make the change.

const assignDelivery = defineTool({
  name: "assignDelivery",
  description:
    "Use this when the dispatcher clearly asks to give a pending delivery to a driver. Needs real ids, so call the read tools first.",
  writes: true,
  schema: z.object({
    delivery_id: z.number().int().positive().describe("Delivery id from getPendingDeliveries"),
    driver_id: z.number().int().positive().describe("Driver id from getAvailableDrivers"),
  }),
  run: async ({ delivery_id, driver_id }) => {
    const { data, error } = await getSupabase().rpc("assign_delivery", {
      p_dispatcher_id: CURRENT_USER_ID,
      p_delivery_id: delivery_id,
      p_driver_id: driver_id,
    });
    if (error) throw new Error(error.message);
    return data;
  },
});

const unassignDelivery = defineTool({
  name: "unassignDelivery",
  description:
    "Use this when the dispatcher wants to take a delivery away from its driver so it can be reassigned. Works only before pickup.",
  writes: true,
  schema: z.object({
    delivery_id: z.number().int().positive().describe("Delivery id from getMyDispatches"),
  }),
  run: async ({ delivery_id }) => {
    const { data, error } = await getSupabase().rpc("unassign_delivery", {
      p_dispatcher_id: CURRENT_USER_ID,
      p_delivery_id: delivery_id,
    });
    if (error) throw new Error(error.message);
    return data;
  },
});

/** Every tool in this list is given to Gemini. */
export const tools: AgentTool[] = [
  getPendingDeliveries,
  getAvailableDrivers,
  getMyDispatches,
  assignDelivery,
  unassignDelivery,
];
