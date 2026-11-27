/**
 * Reads the Supabase settings the build was given. Pure, so it can be tested. The values are
 * public by design (the URL and the publishable key); the service-role key never goes in a build.
 */

export type SupabaseConfig = { url: string; publishableKey: string };

export function readSupabaseConfig(url: string | undefined, publishableKey: string | undefined): SupabaseConfig | null {
  const u = (url ?? "").trim().replace(/\/+$/, "");
  const k = (publishableKey ?? "").trim();
  if (!u || !k) return null;
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  } catch {
    return null;
  }
  return { url: u, publishableKey: k };
}

/** The origin the page may connect to, for the Content-Security-Policy. */
export function supabaseOrigin(url: string | undefined): string | null {
  try {
    return new URL((url ?? "").trim()).origin;
  } catch {
    return null;
  }
}
