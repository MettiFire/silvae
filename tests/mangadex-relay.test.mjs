import test from "node:test";
import assert from "node:assert/strict";
import { GET, OPTIONS } from "../services/catalogue/api/mangadex.ts";
const id = "ad06790a-01e3-400c-a449-0ec152d6756a";
const request = (query) => new Request(`https://catalogue.test/api/mangadex?${query}`);

test("relay rejects arbitrary destinations, unsupported operations and unbounded requests", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async () => {
    throw Error("must not contact upstream");
  };
  for (const query of [
    "resource=https://example.com",
    "resource=/chapter",
    "resource=/cover",
    `resource=/cover&manga[]=${id}&limit=500`,
    "resource=/manga&title=x",
    "resource=/manga&title=One%20Piece&unknown=1",
  ]) {
    assert.equal((await GET(request(query))).status, 400);
  }
});

test("public relay coalesces metadata requests and does not forward account credentials", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++;
    assert.equal(new URL(url).hostname, "api.mangadex.org");
    assert.equal(new Headers(init.headers).has("authorization"), false);
    assert.equal(new Headers(init.headers).has("cookie"), false);
    return Response.json({ result: "ok", data: [{ attributes: { volume: "1" } }], total: 1 });
  };
  const query = `resource=/cover&manga[]=${id}&limit=100&offset=0&order[volume]=asc`;
  const responses = await Promise.all([GET(request(query)), GET(request(query))]);
  assert.equal(calls, 1);
  for (const response of responses) {
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    assert.match(response.headers.get("cache-control"), /s-maxage/);
    assert.equal((await response.json()).total, 1);
  }
  assert.equal((await GET(request(query))).status, 200);
  assert.equal(calls, 1);
});

test("upstream errors are not cached and a subsequent retry can recover", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  let calls = 0;
  globalThis.fetch = async () =>
    ++calls === 1
      ? new Response("unavailable", { status: 503 })
      : Response.json({ result: "ok", data: [] });
  const query = "resource=/manga&title=Recovery%20Test&limit=32";
  assert.equal((await GET(request(query))).status, 502);
  assert.equal((await GET(request(query))).status, 200);
  const preflight = await OPTIONS();
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-methods"), "GET, OPTIONS");
});
