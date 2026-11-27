import { test } from "node:test";
import assert from "node:assert/strict";
import { isLighting, isLookId, normalizeSheets, LOOK_ID_MAX } from "./validate";
import { LOOKS, LOOKS_BY_ID, looksIn } from "./looks";
import { LIGHTINGS } from "./validate";

void test("isLookId accepts the database pattern and rejects everything else", () => {
  for (const ok of ["clean-daylight", "a", "soft-pastel-2", "x1"]) assert.equal(isLookId(ok), true, ok);
  for (const bad of ["", "-lead", "trail-", "double--dash", "Upper", "with space", "under_score", "dot.ed", 12, null, undefined]) {
    assert.equal(isLookId(bad), false, String(bad));
  }
});

void test("isLookId enforces the 40 character limit", () => {
  assert.equal(LOOK_ID_MAX, 40);
  assert.equal(isLookId("a".repeat(40)), true);
  assert.equal(isLookId("a".repeat(41)), false);
  assert.equal(isLookId("ab-".repeat(14) + "a"), false); // 43 characters
});

void test("isLighting accepts only the five groups", () => {
  for (const g of LIGHTINGS) assert.equal(isLighting(g), true, g);
  for (const bad of ["Daylight", "dusk", "", 1, null]) assert.equal(isLighting(bad), false, String(bad));
});

void test("normalizeSheets keeps known sheets in order, drops duplicates, allows an empty list", () => {
  assert.deepEqual(normalizeSheets([]), []);
  assert.deepEqual(normalizeSheets(["before-after", "grid"]), ["grid", "before-after"]);
  assert.deepEqual(normalizeSheets(["grid", "grid"]), ["grid"]);
});

void test("normalizeSheets refuses any unknown or non-string value", () => {
  assert.equal(normalizeSheets(["grid", "collage"]), null);
  assert.equal(normalizeSheets(["Grid"]), null);
  assert.equal(normalizeSheets([1]), null);
});

void test("the looks list has unique ids that all pass the pattern, each in one lighting group", () => {
  assert.equal(LOOKS.length, 25);
  assert.equal(new Set(LOOKS.map((l) => l.id)).size, LOOKS.length);
  for (const l of LOOKS) {
    assert.equal(isLookId(l.id), true, l.id);
    assert.equal(isLighting(l.group), true, l.group);
  }
  assert.equal(LOOKS_BY_ID.get("clean-daylight")?.name, "Clean Daylight");
  assert.ok(looksIn("daylight").every((l) => l.group === "daylight"));
});
