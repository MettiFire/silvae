import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, generateKeyPairSync } from "node:crypto";
import {
  createCodePair,
  registerCodePair,
  sealState,
  openState,
  publicState,
  signedHeaders,
  deregister,
  probeKindleMetadata,
} from "../src/lib/kindle-cloud.server.ts";

const key = randomBytes(32).toString("hex");
const pair = {
  phase: "pending",
  region: "it",
  serial: "s".repeat(40),
  publicCode: "ABCDE",
  privateCode: "secret-private-code",
  expiresAt: 601000,
  interval: 6000,
  nextPollAt: 7000,
};
test("code-pair request is region bounded, has a deadline and only exposes the public code", async () => {
  let request;
  const fetcher = async (url, init) => {
    request = { url, init };
    return Response.json({
      public_code: "ABCDE",
      private_code: "secret-private-code",
      expires_in: 600,
      polling_interval_in_seconds: 6,
    });
  };
  const state = await createCodePair("it", fetcher, 1000);
  assert.equal(request.url, "https://api.amazon.it/auth/create/codepair");
  assert.equal(JSON.parse(request.init.body).code_data.device_serial.length, 40);
  assert.equal(state.nextPollAt, 7000);
  assert.equal(publicState(state, 1000).url, "https://www.amazon.it/code");
  assert.ok(!JSON.stringify(publicState(state, 1000)).includes("secret-private-code"));
  await assert.rejects(() => createCodePair("evil.test", fetcher));
});
test("malformed successful responses and redirects cannot become pending authorizations", async () => {
  for (const payload of [
    {},
    { public_code: "ABCDE", private_code: "p", expires_in: 0, polling_interval_in_seconds: 3 },
    { public_code: "<script>", private_code: "p", expires_in: 600, polling_interval_in_seconds: 3 },
  ])
    await assert.rejects(() => createCodePair("it", async () => Response.json(payload)));
  await assert.rejects(() => createCodePair("it", async () => new Response(null, { status: 302 })));
});
test("pending authorization is distinguished from a rejected registration and overload", async () => {
  assert.equal(
    await registerCodePair(pair, async () =>
      Response.json({ response: { error: { code: "Unauthorized" } } }, { status: 401 }),
    ),
    null,
  );
  await assert.rejects(
    () =>
      registerCodePair(pair, async () =>
        Response.json({ response: { error: { code: "InvalidInput" } } }, { status: 401 }),
      ),
    /rifiutato/,
  );
  await assert.rejects(
    () => registerCodePair(pair, async () => new Response(null, { status: 429 })),
    /occupato/,
  );
  await assert.rejects(
    () =>
      registerCodePair(pair, async () => Response.json({ response: { success: { tokens: {} } } })),
    /credenziali/,
  );
});
test("registration retains only signing credentials and does not expose them in public status", async () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  let body;
  const state = await registerCodePair(pair, async (_, init) => {
    body = JSON.parse(init.body);
    return Response.json({
      response: {
        success: {
          tokens: {
            mac_dms: {
              adp_token: "private-adp",
              device_private_key: privateKey.export({ type: "pkcs8", format: "pem" }),
            },
            bearer: {
              access_token: "private-access",
              refresh_token: "private-refresh",
              expires_in: 3600,
            },
          },
        },
      },
    });
  });
  assert.equal(body.auth_data.code_pair.private_code, pair.privateCode);
  assert.deepEqual(body.requested_token_type, ["bearer", "mac_dms"]);
  assert.equal(state.phase, "connected");
  assert.ok(!JSON.stringify(publicState(state)).includes("private-adp"));
  assert.ok(!JSON.stringify(publicState(state)).includes("private-access"));
  let revocation;
  await deregister(state, async (url, init) => {
    revocation = { url, init };
    return Response.json({ success: true });
  });
  assert.equal(revocation.url, "https://api.amazon.it/auth/deregister");
  assert.equal(JSON.parse(revocation.init.body).deregister_all_existing_accounts, false);
  assert.equal(
    signedHeaders(state, "/FionaCDEServiceEngine/sidecar?type=PDOC&key=TEST")["x-adp-alg"],
    "SHA256withRSA:1.0",
  );
});
test("encrypted state rejects another owner, tampering and a different server key", () => {
  const cipher = sealState(pair, "owner-one", key);
  assert.ok(!cipher.includes(pair.privateCode));
  assert.deepEqual(openState(cipher, "owner-one", key), pair);
  assert.throws(() => openState(cipher, "owner-two", key));
  assert.throws(() => openState(cipher, "owner-one", randomBytes(32).toString("hex")));
  assert.throws(() => openState(cipher.slice(0, -4) + "AAAA", "owner-one", key));
  assert.equal(publicState(pair, 601000).phase, "disconnected");
});

test("encryption works in worker runtimes without a global Buffer", () => {
  const original = globalThis.Buffer;
  try {
    delete globalThis.Buffer;
    assert.deepEqual(openState(sealState(pair, "worker-owner", key), "worker-owner", key), pair);
  } finally {
    globalThis.Buffer = original;
  }
});

test("disconnection refreshes expired bearer credentials using form encoding and never revokes other devices", async () => {
  const requests = [];
  await deregister(
    {
      phase: "connected",
      region: "com",
      serial: "s",
      connectedAt: 0,
      adpToken: "a",
      privateKey: "unused",
      accessToken: "expired",
      refreshToken: "private-refresh",
      tokenExpiresAt: 0,
    },
    async (url, init) => {
      requests.push({ url, init });
      return requests.length === 1
        ? Response.json({ access_token: "new-access" })
        : Response.json({ success: true });
    },
  );
  assert.equal(requests[0].init.headers["Content-Type"], "application/x-www-form-urlencoded");
  assert.equal(new URLSearchParams(requests[0].init.body).get("source_token"), "private-refresh");
  assert.equal(requests[1].init.headers["x-amz-access-token"], "new-access");
  assert.equal(JSON.parse(requests[1].init.body).deregister_all_existing_accounts, false);
});

test("Kindle metadata checks use signed read-only requests and discard book contents", async () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const state = {
    phase: "connected",
    region: "it",
    serial: "s",
    connectedAt: 0,
    adpToken: "private-device",
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }),
    accessToken: "a",
    refreshToken: "r",
    tokenExpiresAt: 0,
  };
  let sent;
  const result = await probeKindleMetadata(state, async (url, init) => {
    sent = { url, init };
    return new Response("<response><meta_data><title>Private title</title></meta_data></response>");
  });
  assert.equal(result.status, "available");
  assert.equal(sent.init.method, "GET");
  assert.equal(sent.init.headers["x-adp-token"], state.adpToken);
  assert.ok(!JSON.stringify(result).includes("Private title"));
  assert.ok(!JSON.stringify(result).includes(state.adpToken));
  assert.equal(
    (await probeKindleMetadata(state, async () => new Response("private failure", { status: 401 })))
      .status,
    "blocked",
  );
  const empty = await probeKindleMetadata(state, async () => new Response("<response/>"));
  const unsafe = await probeKindleMetadata(
    state,
    async () => new Response("<!DOCTYPE response><response/>"),
  );
  assert.equal(empty.status, "empty");
  assert.equal(unsafe.status, "error");
});
