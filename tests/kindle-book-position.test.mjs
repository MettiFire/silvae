import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { probeKindleBook } from "../src/lib/kindle-cloud.server.ts";
const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const state = { phase: "connected", adpToken: "private-token", privateKey };
const book = { key: "A".repeat(32), type: "PDOC" };
test("signed book lookup returns only verified last-read position and timestamp, never an estimated percent or annotations", async () => {
  const result = await probeKindleBook(state, book, async (url, init) => {
    assert.equal(
      url,
      `https://cde-ta-g7g.amazon.com/FionaCDEServiceEngine/sidecar?type=PDOC&key=${book.key}`,
    );
    assert.equal(init.method, "GET");
    assert.equal(init.redirect, "manual");
    assert.equal(init.headers["x-adp-token"], "private-token");
    return Response.json({
      payload: {
        records: [
          { type: "kindle.highlight", location: 99999, text: "private annotation" },
          {
            type: "kindle.lpr",
            location: "1234",
            creationTime: "2026-01-02 12:34:56.1",
            end: 99999,
          },
        ],
      },
    });
  });
  assert.equal(result.status, "available");
  assert.equal(result.position, 1234);
  assert.equal(result.updatedAt, Date.parse("2026-01-02T12:34:56.100Z"));
  assert.equal(result.percent, undefined);
  assert.ok(!JSON.stringify(result).includes("private"));
});
test("unrecognized, malformed and absent positions are distinct from a denied request", async () => {
  for (const records of [
    [],
    [{ type: "kindle.highlight", location: 10 }],
    [{ type: "kindle.lpr", location: -1 }],
    [{ type: "kindle.lpr", location: 1.5 }],
  ]) {
    const result = await probeKindleBook(state, book, async () =>
      Response.json({ payload: { records } }),
    );
    assert.notEqual(result.status, "available");
    assert.equal(result.position, undefined);
  }
  assert.equal(
    (await probeKindleBook(state, book, async () => new Response("", { status: 403 }))).status,
    "blocked",
  );
  assert.equal(
    (await probeKindleBook(state, book, async () => new Response("<html>challenge</html>"))).status,
    "error",
  );
  await assert.rejects(() => probeKindleBook(state, { ...book, key: "../?token=secret" }));
  await assert.rejects(() => probeKindleBook(state, { ...book, type: "OTHER" }));
  const conflicting = await probeKindleBook(state, book, async () =>
    Response.json({
      payload: {
        records: [
          { type: "kindle.lpr", location: 1 },
          { type: "kindle.lpr", location: 2 },
        ],
      },
    }),
  );
  assert.equal(conflicting.status, "error");
  const missingDate = await probeKindleBook(state, book, async () =>
    Response.json({
      payload: { records: [{ type: "kindle.lpr", location: 0, creationTime: "invalid" }] },
    }),
  );
  assert.equal(missingDate.position, 0);
  assert.equal(missingDate.updatedAt, undefined);
});
