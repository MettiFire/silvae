import test from "node:test";
import assert from "node:assert/strict";
import { createOpenLibrarySearch } from "../src/lib/openlibrary-search.ts";

test("public catalogue requests share in-flight work and cache successful results", async () => {
  let calls = 0;
  const search = createOpenLibrarySearch(async (url) => {
    calls++;
    assert.equal(new URL(url).origin, "https://openlibrary.org");
    return new Response(JSON.stringify({ docs: [{ title: "Dune" }] }));
  });
  const [a, b] = await Promise.all([
    search({ q: "Dune", limit: "5" }),
    search({ limit: "5", q: "Dune" }),
  ]);
  assert.deepEqual(a, b);
  await search({ q: "Dune", limit: "5" });
  assert.equal(calls, 1);
  await search({ q: "Dune", limit: "5", lang: "it" });
  assert.equal(calls, 2);
});
test("an upstream outage is never cached and a later attempt can recover", async () => {
  let calls = 0;
  const search = createOpenLibrarySearch(async () =>
    ++calls === 1 ? new Response("unavailable", { status: 503 }) : new Response('{"docs":[]}'),
  );
  assert.equal((await search({ q: "Dune" })).status, 503);
  assert.equal((await search({ q: "Dune" })).status, 200);
  assert.equal(calls, 2);
});
test("invalid HTTP 200 responses do not poison the catalogue cache", async () => {
  let calls = 0;
  const search = createOpenLibrarySearch(
    async () => new Response(++calls === 1 ? "{}" : '{"docs":[]}'),
  );
  await assert.rejects(search({ q: "Dune" }), /Invalid catalogue/);
  assert.equal((await search({ q: "Dune" })).status, 200);
});
