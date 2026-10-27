import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { handleAmazonRelay } from "../services/kindle/api/amazon.ts";
import { amazonFetch } from "../src/lib/kindle-cloud.server.ts";
const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const verifyKey = publicKey.export({ type: "spki", format: "der" }).toString("base64");
const payload = {
  region: "it",
  path: "/auth/create/codepair",
  body: "{}",
  headers: { "Content-Type": "application/json" },
};
function request(value = payload, time = Date.now()) {
  const body = JSON.stringify(value);
  return new Request("https://relay.test/api/amazon", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-silvae-time": String(time),
      "x-silvae-signature": sign(null, Buffer.from(`${time}\n${body}`), privateKey).toString(
        "base64",
      ),
    },
    body,
  });
}
test("relay rejects unsigned, expired and tampered requests before contacting Amazon", async () => {
  let calls = 0;
  const upstream = async () => {
    calls++;
    return Response.json({});
  };
  assert.equal(
    (
      await handleAmazonRelay(
        new Request("https://relay.test", { method: "POST", body: "{}" }),
        verifyKey,
        upstream,
      )
    ).status,
    401,
  );
  assert.equal(
    (await handleAmazonRelay(request(payload, Date.now() - 120000), verifyKey, upstream)).status,
    401,
  );
  const signed = request();
  const tampered = new Request(signed.url, {
    method: "POST",
    headers: signed.headers,
    body: '{"changed":true}',
  });
  assert.equal((await handleAmazonRelay(tampered, verifyKey, upstream)).status, 401);
  assert.equal(calls, 0);
});
test("relay has fixed Amazon hosts and auth paths and forwards no browser cookies", async () => {
  let sent;
  const upstream = async (url, init) => {
    sent = { url, init };
    return Response.json({ public_code: "ABCDE" });
  };
  const response = await handleAmazonRelay(request(), verifyKey, upstream);
  assert.equal(response.status, 200);
  assert.equal(sent.url, "https://api.amazon.it/auth/create/codepair");
  assert.equal(sent.init.redirect, "error");
  assert.equal(sent.init.credentials, "omit");
  assert.equal(sent.init.headers.has("cookie"), false);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  for (const bad of [
    { ...payload, region: "it.evil.test" },
    { ...payload, path: "/auth/create/codepair?leak=1" },
    { ...payload, path: "https://evil.test" },
    { ...payload, headers: { Cookie: "private" } },
  ])
    assert.equal((await handleAmazonRelay(request(bad), verifyKey, upstream)).status, 400);
});

test("Silvae signs relay requests without forwarding its private signing key", async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.KINDLE_RELAY_PRIVATE_KEY;
  const encoded = privateKey.export({ type: "pkcs8", format: "der" }).toString("base64");
  process.env.KINDLE_RELAY_PRIVATE_KEY = encoded;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, "https://silvae-kindle.vercel.app/api/amazon");
      assert.ok(!init.body.includes(encoded));
      return handleAmazonRelay(new Request(url, init), verifyKey, async () =>
        Response.json({ public_code: "ABCDE" }),
      );
    };
    const result = await amazonFetch("https://api.amazon.it/auth/create/codepair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(result.status, 200);
    assert.equal((await result.json()).public_code, "ABCDE");
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.KINDLE_RELAY_PRIVATE_KEY;
    else process.env.KINDLE_RELAY_PRIVATE_KEY = previousKey;
  }
});
