import test from "node:test";
import assert from "node:assert/strict";
import { authDestination } from "../src/lib/auth-destination.ts";
test("login preserves settings sections and query parameters for internal destinations", () => {
  assert.equal(authDestination("/settings?section=preferences"), "/settings?section=preferences");
  assert.equal(
    authDestination("/clubs?club=abc&topic=123#discussion"),
    "/clubs?club=abc&topic=123#discussion",
  );
});
test("login refuses external destinations, normalization tricks and auth loops", () => {
  for (const value of [
    undefined,
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/%2f%2fevil.test",
    "/auth?returnTo=/library",
    "/a/../auth",
    "/\nauth",
    "javascript:alert(1)",
    "/".repeat(2001),
  ])
    assert.equal(authDestination(value), "/", String(value));
});
