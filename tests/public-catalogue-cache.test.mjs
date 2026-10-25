import test from "node:test";
import assert from "node:assert/strict";
import { createPublicCatalogueCache } from "../src/lib/public-catalogue-cache.ts";

test("public metadata deduplicates concurrent requests, expires and separates languages", async () => {
  let calls = 0,
    time = 0;
  const get = createPublicCatalogueCache(
    async () => {
      calls++;
      return new Response('{"items":[]}');
    },
    () => time,
  );
  await Promise.all([
    get("https://example.test?q=dune&lang=it"),
    get("https://example.test?q=dune&lang=it"),
  ]);
  await get("https://example.test?q=dune&lang=it");
  assert.equal(calls, 1);
  await get("https://example.test?q=dune&lang=en");
  assert.equal(calls, 2);
  time = 180001;
  await get("https://example.test?q=dune&lang=it");
  assert.equal(calls, 3);
});
test("quota exhaustion immediately falls back for other queries and recovers after cooldown", async () => {
  let calls = 0,
    time = 0;
  const get = createPublicCatalogueCache(
    async () => (++calls === 1 ? new Response("", { status: 429 }) : new Response("{}")),
    () => time,
  );
  assert.equal((await get("a")).status, 429);
  assert.equal((await get("b")).status, 429);
  assert.equal(calls, 1);
  time = 60001;
  assert.equal((await get("b")).status, 200);
});
test("broken payloads, network failures and HTTP errors never poison the cache", async () => {
  let calls = 0;
  const get = createPublicCatalogueCache(async () => {
    calls++;
    if (calls === 1) throw new Error("offline");
    if (calls === 2) return new Response("broken");
    if (calls === 3) return new Response("", { status: 503 });
    return new Response("{}");
  });
  await assert.rejects(get("a"));
  await assert.rejects(get("a"));
  assert.equal((await get("a")).status, 503);
  assert.equal((await get("a")).status, 200);
  assert.equal(calls, 4);
});
