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
      .select("id, customer, zone, weight_kg, priority, deadline, status, drivers(name)")
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
  return NextResponse.json({ deliveries: rows, drivers: drivers.data });
}
