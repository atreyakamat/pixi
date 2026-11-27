import { test } from "node:test";
import assert from "node:assert/strict";
import { REFUSED, isNetworkFailure, saveMessage, signInMessage } from "./messages";

void test("signInMessage explains the common sign-in failures in plain words", () => {
  assert.match(signInMessage({ message: "Invalid login credentials", status: 400 }), /email and password don't match/);
  assert.match(signInMessage({ message: "Email not confirmed" }), /hasn't been confirmed/);
  assert.match(signInMessage({ message: "rate limit", status: 429 }), /Too many tries/);
  assert.match(signInMessage({ message: "TypeError: Failed to fetch" }), /Can't reach the sign-in service/);
  assert.equal(signInMessage(null), "Sign-in didn't work. Try again.");
});

void test("signInMessage never shows the raw server text for an unknown failure", () => {
  assert.equal(signInMessage({ message: "something internal xyz", status: 500 }), "Sign-in didn't work. Try again.");
});

void test("saveMessage says the account is not allowed when row-level security refuses", () => {
  assert.equal(saveMessage({ code: "42501", message: "new row violates row-level security policy" }, "save the look"), REFUSED);
});

void test("saveMessage reports a network failure separately from a refusal", () => {
  assert.equal(isNetworkFailure({ message: "Failed to fetch" }), true);
  assert.equal(isNetworkFailure({ message: "Failed to fetch", code: "PGRST" }), false);
  assert.equal(saveMessage({ message: "Failed to fetch" }, "save the look"), "Can't reach the studio. Check your connection and try again.");
  assert.equal(saveMessage({ message: "boom", code: "23505" }, "save the look"), "Couldn't save the look. Try again.");
});
