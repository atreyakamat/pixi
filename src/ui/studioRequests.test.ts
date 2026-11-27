import { test } from "node:test";
import assert from "node:assert/strict";
import { authHeaders, fileNameFor, projectCreateBody, projectNameFor, workerUrl } from "./studioRequests";

void test("workerUrl joins the site and the worker path, without a doubled slash", () => {
  assert.equal(workerUrl("https://studio.example", "/projects"), "https://studio.example/api/worker/projects");
  assert.equal(workerUrl("https://studio.example/", "/projects/abc/photos"), "https://studio.example/api/worker/projects/abc/photos");
});

void test("authHeaders sends the bearer token, and JSON only with a body", () => {
  assert.deepEqual(authHeaders("cwp_wk_x", true), { Authorization: "Bearer cwp_wk_x", "Content-Type": "application/json" });
  assert.deepEqual(authHeaders("tok", false), { Authorization: "Bearer tok" });
});

void test("projectCreateBody keeps the PC shape and adds organizationId only for a user token", () => {
  assert.deepEqual(projectCreateBody("Pixi x"), { name: "Pixi x", kind: "other" });
  assert.deepEqual(projectCreateBody("Pixi x", "org-1"), { name: "Pixi x", kind: "other", organizationId: "org-1" });
});

void test("projectNameFor and fileNameFor match the names the studio has always had", () => {
  assert.equal(projectNameFor(new Date("2026-11-26T09:05:30Z")), "Pixi 2026-11-26 09:05");
  assert.equal(fileNameFor("s1", "png"), "pixi-s1.png");
  assert.equal(fileNameFor("s1", ""), "pixi-s1.jpg");
  assert.equal(fileNameFor("s1", undefined), "pixi-s1.jpg");
});
