# DispatchIQ: 5 slides (check every line against your app before using)

## 1. Title and team
- DispatchIQ: Delivery Dispatch Agent (Logistics)
- Team: <number>, <names and roles>

## 2. The problem
- Dispatchers match parcels to drivers by hand, using zone, vehicle size and workload
- Mistakes mean late urgent deliveries and overloaded drivers

## 3. Our solution and demo
- Dispatcher types plain English; the agent finds and assigns the right driver
- Demo: "Which urgent deliveries still need a driver?" then "Assign the pharmacy delivery to the best driver."
- Refused: "Give the furniture delivery to Karthik." (wrong zone, too heavy)

## 4. How the agent works
- Flow: dispatcher -> Gemini -> tools -> Supabase
- Read: getPendingDeliveries, getAvailableDrivers, getMyDispatches
- Write: assignDelivery, unassignDelivery (database functions check all rules)
- Stack: Next.js, Supabase, Gemini, Zod, Vercel

## 5. Results and links
- Works: assigning with live board updates; rules enforced in the database
- Next: route suggestions, delivery status updates by drivers
- GitHub: <repo link> · Live app: <Vercel link>
