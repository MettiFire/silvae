import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAuthSession } from "../src/lib/auth-session.ts";

test("sessions without metadata do not break preference reads", () => {
  for (const metadata of [null, undefined]) {
    const raw = { user: { id: "reader", user_metadata: metadata, app_metadata: metadata } };
    const session = normalizeAuthSession(raw);
    assert.equal(session.user.user_metadata.reading_preferences_v1, undefined);
    assert.deepEqual(session.user.app_metadata, {});
    assert.equal(raw.user.user_metadata, metadata);
  }
});

test("session normalization preserves account preferences and sign-out", () => {
  const preferences = { language: "it" };
  const session = normalizeAuthSession({ user: { id: "reader", user_metadata: { reading_preferences_v1: preferences }, app_metadata: { provider: "google" } } });
  assert.equal(session.user.user_metadata.reading_preferences_v1, preferences);
  assert.equal(session.user.app_metadata.provider, "google");
  assert.equal(normalizeAuthSession(null), null);
});