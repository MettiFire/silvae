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
      assert.equal(init.redirect, "manual");
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

test("transport failures distinguish signing from networking without exposing upstream errors", async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.KINDLE_RELAY_PRIVATE_KEY;
  process.env.KINDLE_RELAY_PRIVATE_KEY = privateKey
    .export({ type: "pkcs8", format: "der" })
    .toString("base64");
  try {
    globalThis.fetch = async () => {
      throw Error("private upstream diagnostic");
    };
    await assert.rejects(
      () =>
        amazonFetch("https://api.amazon.it/auth/create/codepair", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }),
      /Amazon: servizio di collegamento non raggiungibile/,
    );
    process.env.KINDLE_RELAY_PRIVATE_KEY = "invalid";
    await assert.rejects(
      () =>
        amazonFetch("https://api.amazon.it/auth/create/codepair", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }),
      /Amazon: firma del collegamento non disponibile/,
    );
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.KINDLE_RELAY_PRIVATE_KEY;
    else process.env.KINDLE_RELAY_PRIVATE_KEY = previousKey;
  }
});

test("Kindle metadata is a fixed read-only target with device signing headers", async () => {
  let sent;
  const metadata = {
    region: "it",
    path: "/kindle/metadata",
    headers: {
      "x-adp-token": "device-token",
      "x-adp-alg": "SHA256withRSA:1.0",
      "x-adp-signature": "signed-request",
    },
    body: "",
  };
  const response = await handleAmazonRelay(request(metadata), verifyKey, async (url, init) => {
    sent = { url, init };
    return new Response("<response/>");
  });
  assert.equal(response.status, 200);
  assert.equal(
    sent.url,
    "https://todo-ta-g7g.amazon.com/FionaTodoListProxy/syncMetaData?item_count=1000",
  );
  assert.equal(sent.init.method, "GET");
  assert.equal(sent.init.body, undefined);
  assert.equal(sent.init.headers.get("x-adp-token"), "device-token");
  assert.equal(
    (
      await handleAmazonRelay(
        request({ ...metadata, path: "/kindle/metadata?url=https://evil.test" }),
        verifyKey,
      )
    ).status,
    400,
  );
});

test("per-book relay validates the content identifier and never permits extra URLs or request bodies", async () => {
  const data = {
    region: "it",
    path: "/kindle/sidecar",
    book: { type: "PDOC", key: "A".repeat(32) },
    body: "",
    headers: {
      "x-adp-token": "token",
      "x-adp-alg": "SHA256withRSA:1.0",
      "x-adp-signature": "signed",
    },
  };
  let calls = 0;
  const upstream = async (url, init) => {
    calls++;
    assert.equal(
      url,
      `https://cde-ta-g7g.amazon.com/FionaCDEServiceEngine/sidecar?type=PDOC&key=${data.book.key}`,
    );
    assert.equal(init.method, "GET");
    assert.equal(init.body, undefined);
    assert.equal(init.redirect, "manual");
    return Response.json({ payload: { records: [] } });
  };
  assert.equal((await handleAmazonRelay(request(data), verifyKey, upstream)).status, 200);
  for (const bad of [
    { ...data, book: { ...data.book, key: "A&url=https://evil.test" } },
    { ...data, book: { ...data.book, type: "OTHER" } },
    { ...data, body: "private" },
    { ...data, headers: {} },
    { ...data, headers: { ...data.headers, Cookie: "secret" } },
  ]) {
    assert.equal((await handleAmazonRelay(request(bad), verifyKey, upstream)).status, 400);
  }
  assert.equal(calls, 1);
});

test("modern sidecar uses a fixed KFX format parameter without allowing arbitrary query strings", async () => {
  const data = {
    region: "it",
    path: "/kindle/sidecar",
    book: { type: "PDOC", key: "A".repeat(32) },
    format: "YJBINARY",
    body: "",
    headers: {
      "x-adp-token": "token",
      "x-adp-alg": "SHA256withRSA:1.0",
      "x-adp-signature": "signed",
    },
  };
  assert.equal(
    (
      await handleAmazonRelay(request(data), verifyKey, async (url) => {
        assert.equal(
          url,
          `https://cde-ta-g7g.amazon.com/FionaCDEServiceEngine/sidecar?type=PDOC&key=${data.book.key}&format=YJBINARY`,
        );
        return Response.json({ payload: { records: [] } });
      })
    ).status,
    200,
  );
  assert.equal(
    (await handleAmazonRelay(request({ ...data, format: "YJBINARY&key=other" }), verifyKey)).status,
    400,
  );
});
test("last-read relay fixes the annotation filter and rejects other annotation requests", async () => {
  const data = {
    region: "it",
    path: "/kindle/last-read",
    guid: "CR!test-version",
    book: { type: "PDOC", key: "A".repeat(32) },
    body: "",
    headers: {
      "x-adp-token": "token",
      "x-adp-alg": "SHA256withRSA:1.0",
      "x-adp-signature": "signed",
    },
  };
  let calls = 0;
  const upstream = async (url, init) => {
    calls++;
    assert.equal(
      url,
      `https://cde-ta-g7g.amazon.com/FionaCDEServiceEngine/getAnnotations?filter=last_read&type=PDOC&key=${data.book.key}&guid=CR!test-version`,
    );
    assert.equal(init.method, "GET");
    return new Response("<annotations/>");
  };
  assert.equal((await handleAmazonRelay(request(data), verifyKey, upstream)).status, 200);
  for (const bad of [
    { ...data, path: "/kindle/last-read?filter=all" },
    { ...data, guid: "test&filter=all" },
    { ...data, body: "{}" },
    { ...data, book: { ...data.book, key: "bad&filter=all" } },
  ])
    assert.equal((await handleAmazonRelay(request(bad), verifyKey, upstream)).status, 400);
  assert.equal(calls, 1);
});
