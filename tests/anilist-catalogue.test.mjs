import test from "node:test";
import assert from "node:assert/strict";
import { mapAniListManga, aniListCatalogue } from "../src/lib/anilist-catalogue.ts";
const record = {
  id: 30011,
  idMal: 11,
  title: { english: "Naruto" },
  volumes: 72,
  status: "FINISHED",
  description: "<p>A ninja</p>",
  staff: { edges: [{ role: "Story & Art", node: { name: { full: "Masashi Kishimoto" } } }] },
};
test("third provider preserves the MAL series identity, authors and volume completion", () => {
  const book = mapAniListManga(record);
  assert.equal(book.id, "manga:mal:11");
  assert.equal(book.manga.totalVolumes, 72);
  assert.equal(book.manga.status, "completed");
  assert.deepEqual(book.authors, ["Masashi Kishimoto"]);
  assert.equal(mapAniListManga({ ...record, idMal: null }), null);
});
test("catalogue uses GraphQL variables and rejects errors instead of reporting an empty search", async () => {
  const books = await aniListCatalogue({ query: 'Naruto "' }, async (url, options) => {
    assert.equal(url, "https://graphql.anilist.co");
    assert.equal(JSON.parse(options.body).variables.q, 'Naruto "');
    return Response.json({ data: { Page: { media: [record] } } });
  });
  assert.equal(books[0].id, "manga:mal:11");
  await assert.rejects(
    aniListCatalogue({ query: "Naruto" }, async () => Response.json({ errors: [{}] })),
  );
});
