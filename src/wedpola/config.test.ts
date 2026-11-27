import { test } from "node:test";
import assert from "node:assert/strict";
import { readSupabaseConfig, supabaseOrigin } from "./config";

void test("readSupabaseConfig needs both a URL and a publishable key", () => {
  assert.equal(readSupabaseConfig(undefined, "pk"), null);
  assert.equal(readSupabaseConfig("https://abc.supabase.co", ""), null);
  assert.equal(readSupabaseConfig("  ", "pk"), null);
});

void test("readSupabaseConfig trims, drops a trailing slash, and refuses a non-web URL", () => {
  assert.deepEqual(readSupabaseConfig(" https://abc.supabase.co/ ", " sb_publishable_x "), { url: "https://abc.supabase.co", publishableKey: "sb_publishable_x" });
  assert.equal(readSupabaseConfig("not a url", "pk"), null);
  assert.equal(readSupabaseConfig("ftp://abc.supabase.co", "pk"), null);
});

void test("supabaseOrigin gives the origin for the Content-Security-Policy", () => {
  assert.equal(supabaseOrigin("https://abc.supabase.co/rest/v1"), "https://abc.supabase.co");
  assert.equal(supabaseOrigin(undefined), null);
});
