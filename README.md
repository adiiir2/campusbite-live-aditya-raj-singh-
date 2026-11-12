# DispatchIQ: Delivery Dispatch Agent (Logistics)

A dispatcher types plain English ("Assign the pharmacy delivery to the best driver"). A Gemini agent checks deliveries and drivers, then assigns them. The database enforces the rules, so the AI cannot break them.

**Stack:** Next.js · TypeScript · Tailwind · Supabase · Gemini function calling · Zod · Vercel
**Backup model:** if Gemini is busy or out of free quota, the same tools run on Groq (`GROQ_API_KEY`).
**Live link:** <add Vercel URL> · **Team:** <add names and roles>

## Agent tools
| Tool | Type | What it does |
| --- | --- | --- |
| getPendingDeliveries | read | Deliveries waiting for a driver, urgent first |
| getAvailableDrivers | read | Available drivers with zone, capacity and open deliveries |
| getMyDispatches | read | Deliveries that are assigned or on the road |
| assignDelivery | write | Calls `assign_delivery()` in the database |
| unassignDelivery | write | Calls `unassign_delivery()` in the database |

## Business rules (checked in the database)
Driver must be available, in the delivery's zone, have enough vehicle capacity, and have fewer than `max_active` open deliveries. Only pending deliveries can be assigned; deliveries in transit cannot be unassigned. Dispatchers only touch their own data.

## Tables
`dispatchers`, `drivers`, `deliveries` (see `seed/logistics_dispatch.sql`).

## Demo prompts (run in this order)
Each chat message uses 2-4 Gemini requests, so keep the demo short.

1. "Which urgent deliveries still need a driver?" (shows the read tools)
2. "Assign the pharmacy delivery to the best driver." (a write: it picks a T Nagar driver with enough capacity)
3. "Give the furniture delivery to Karthik." (refused: wrong zone and too heavy)
4. "Assign Metro Mart to Lakshmi." (refused: the delivery is already assigned)
5. "Take the pharmacy delivery off its driver." (unassign; a delivery already on the road cannot be unassigned)
6. "Write me a poem about cricket." (refused: off topic)

To reset the data before a demo, run `seed/logistics_dispatch.sql` again in the Supabase SQL Editor.

## Setup
1. `npm install`
2. Supabase SQL Editor: run `seed/logistics_dispatch.sql` (re-run any time to reset)
3. Copy `.env.example` to `.env.local` and fill in the values
4. `npm run dev`, check `/api/health`, log in with the passcode
