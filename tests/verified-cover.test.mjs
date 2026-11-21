import assert from "node:assert/strict";
import test from "node:test";
import { resolveVerifiedCover } from "../src/lib/verified-cover.server.ts";

const origin = "https://covers.openlibrary.org/b/id";
const archive = "https://archive.org/download/m_covers_0010/m_covers_0010_52.zip/0010523338-M.jpg";
const jpeg = Uint8Array.from({ length: 2000 }, (_, index) => [255, 216, 255][index] ?? 0);

test("Cover repair uses only exact catalogue records and verifies known image redirects", async () => {
  const calls = [];
  const fetcher = async (url) => {
    const address = String(url);
    calls.push(address);
    if (address.endsWith("/works/OL1W.json"))
      return Response.json({ key: "/works/OL1W", covers: [-1, 1, 2] });
    if (address.includes("/editions.json")) return Response.json({ entries: [] });
    if (address === `${origin}/1-M.jpg?default=false`)
      return new Response(new Uint8Array(43), { headers: { "content-type": "image/png" } });
    if (address === `${origin}/2-M.jpg?default=false`) return Response.redirect(archive);
    if (address === archive)
      return new Response(jpeg, { headers: { "content-type": "image/jpeg" } });
    throw new Error("Unexpected request");
  };
  assert.equal(await resolveVerifiedCover("ol:OL1W", fetcher), `${origin}/2-M.jpg?default=false`);
  assert.ok(calls.includes(archive));
  const previousRequests = calls.length;
  assert.equal(await resolveVerifiedCover("csv:local-id", fetcher), null);
  assert.equal(calls.length, previousRequests);
});

test("Cover repair rejects mismatched catalogue records and untrusted redirects", async () => {
  assert.equal(
    await resolveVerifiedCover("ol:OL1M", async () =>
      Response.json({ key: "/books/OL2M", covers: [123] }),
    ),
    null,
  );
  const calls = [];
  assert.equal(
    await resolveVerifiedCover("ol:OL1M", async (url) => {
      calls.push(String(url));
      if (String(url).endsWith(".json"))
        return Response.json({ key: "/books/OL1M", covers: [123] });
      return Response.redirect("https://untrusted.example/image.jpg");
    }),
    null,
  );
  assert.ok(!calls.some((url) => url.includes("untrusted")));
});
