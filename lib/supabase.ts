import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

let client: SupabaseClient | null = null;

/**
 * Students often copy the URL with "/rest/v1/" or a trailing slash.
 * Supabase needs only the base address, for example https://abcdxyz.supabase.co
 */
function cleanSupabaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "").replace(/\/+$/, "");
}

// Some networks drop connections now and then ("fetch failed"). Try again a few times.
async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetch(input, { ...init, signal: AbortSignal.timeout(8000) });
    } catch (err) {
      if (attempt >= 6) throw err;
      await new Promise((r) => setTimeout(r, 300 * attempt));
    }
  }
}

/**
 * Server-side Supabase client.
 * It uses the secret (service_role) key, so use it ONLY in API routes and agent tools.
 */
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(cleanSupabaseUrl(requireEnv("SUPABASE_URL")), requireEnv("SUPABASE_SECRET_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fetchWithRetry },
    });
  }
  return client;
}
