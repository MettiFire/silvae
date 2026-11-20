import test from "node:test";
import assert from "node:assert/strict";
import { startGoogleSignIn } from "../src/lib/google-sign-in.ts";

test("independent hosting starts Google through its own Supabase without using Lovable", async () => {
  const redirectTo = "https://silvae.example/auth?returnTo=%2Flibrary";
  const result = await startGoogleSignIn("supabase", redirectTo, {
    signInWithOAuth: async (request) => {
      assert.deepEqual(request, { provider: "google", options: { redirectTo } });
      return { data: { url: "https://accounts.google.com/authorize" }, error: null };
    },
  }, async () => { assert.fail("Independent sign-in must not contact Lovable"); });
  assert.equal(result.redirected, true);
});

test("existing Lovable hosting preserves its broker and popup completion", async () => {
  for (const mode of [undefined, "lovable"]) {
    const result = await startGoogleSignIn(mode, "https://silvae.lovable.app/auth", {
      signInWithOAuth: async () => { assert.fail("Existing hosting must keep its broker"); },
    }, async (provider, options) => {
      assert.equal(provider, "google");
      assert.equal(options.redirect_uri, "https://silvae.lovable.app/auth");
      return { error: null, redirected: false };
    });
    assert.equal(result.redirected, false);
  }
});

test("provider errors and incomplete starts fail instead of silently returning to login", async () => {
  const failure = new Error("Provider not configured");
  await assert.rejects(startGoogleSignIn("supabase", "https://silvae.example/auth", {
    signInWithOAuth: async () => ({ data: { url: null }, error: failure }),
  }, async () => assert.fail()), (error) => error === failure);
  await assert.rejects(startGoogleSignIn("supabase", "https://silvae.example/auth", {
    signInWithOAuth: async () => ({ data: { url: null }, error: null }),
  }, async () => assert.fail()), /Google/);
  await assert.rejects(startGoogleSignIn("unknown", "https://silvae.example/auth", {
    signInWithOAuth: async () => assert.fail(),
  }, async () => assert.fail()), /configurazione/i);
});
