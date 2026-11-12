# DispatchIQ project rules
- Problem: Delivery Dispatch Agent (logistics). A dispatcher types plain English; the agent checks pending deliveries and drivers, then assigns or unassigns deliveries. A dispatch board shows live data.
- Stack: Next.js App Router, React, TypeScript, Tailwind CSS, Supabase (server only), Gemini function calling, Zod.
- Tables (seed/logistics_dispatch.sql):
  - dispatchers(id, name, depot)
  - drivers(id, dispatcher_id, name, vehicle bike|van|truck, capacity_kg, zone, max_active, status available|on_break|off_duty)
  - deliveries(id, dispatcher_id, customer, address, zone, weight_kg, priority urgent|normal, deadline, status pending|assigned|in_transit|delivered|cancelled, driver_id, created_at)
- The logged-in dispatcher is CURRENT_USER_ID = "D001" (lib/currentUser.ts). Never take a user id as a tool argument.
- Agent tools live in lib/agent/tools.ts and use defineTool() with a Zod schema; descriptions start with "Use this when...".
- Assigning and unassigning must use the database functions assign_delivery(p_dispatcher_id, p_delivery_id, p_driver_id) and unassign_delivery(p_dispatcher_id, p_delivery_id) through getSupabase().rpc(). Never update deliveries directly from TypeScript.
- Business rules (enforced in the database): driver must be available, in the same zone, vehicle capacity >= parcel weight, below max_active open deliveries; only pending deliveries can be assigned; only "assigned" (not in_transit) can be unassigned; dispatchers only touch their own data.
- Only files in lib/ and app/api/ may call getSupabase(). Never use the Supabase secret key in components. Never commit .env.local.
- Weights in kg, deadlines as "11:00 am". Keep code simple, with short comments.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
