import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { CURRENT_USER_ID, formatTime } from "@/lib/currentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/dispatch -> the dispatcher's open deliveries and their drivers
export async function GET() {
  const db = getSupabase();
  const [deliveries, drivers] = await Promise.all([
    db
      .from("deliveries")
      .select("id, customer, address, zone, weight_kg, priority, deadline, status, driver_id, drivers(name)")
      .eq("dispatcher_id", CURRENT_USER_ID)
      .in("status", ["pending", "assigned", "in_transit"])
      .order("deadline")
      .limit(50),
    db
      .from("drivers")
      .select("id, name, vehicle, capacity_kg, zone, max_active, status")
      .eq("dispatcher_id", CURRENT_USER_ID)
      .order("name")
      .limit(50),
  ]);
  const error = deliveries.error ?? drivers.error;
  if (error || !deliveries.data || !drivers.data) {
    console.error("[GET /api/dispatch]", error?.message);
    return NextResponse.json({ error: "Could not reach the database" }, { status: 500 });
  }

  const rows = deliveries.data.map((d) => {
    const drv = Array.isArray(d.drivers) ? d.drivers[0] : d.drivers;
    return { ...d, drivers: undefined, deadline: formatTime(d.deadline), driver: drv?.name ?? null };
  });
  // how many open deliveries each driver is carrying
  const driversWithLoad = drivers.data.map((d) => ({
    ...d,
    open: deliveries.data.filter((x) => x.driver_id === d.id && x.status !== "pending").length,
  }));
  return NextResponse.json({ deliveries: rows, drivers: driversWithLoad });
}
