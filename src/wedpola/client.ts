import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readSupabaseConfig } from "./config";

/** The Supabase settings this build was given, or null when they are missing. */
export const SUPABASE_CONFIG = readSupabaseConfig(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

let client: SupabaseClient | null = null;

/** One client for the page. The session lives in Supabase's default browser storage. */
export function getClient(): SupabaseClient | null {
  if (!SUPABASE_CONFIG) return null;
  client ??= createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.publishableKey);
  return client;
}
