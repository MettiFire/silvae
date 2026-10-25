import test from "node:test";
import assert from "node:assert/strict";
import { parsePreferences, emptyPreferences } from "../src/lib/reading-preferences.ts";
import { resolveFragmentLanguages } from "../src/lib/fragment-languages.ts";
import { selectMultilingualFragment } from "../src/lib/fragment-archive.ts";
import { unifiedSearchResults } from "../src/lib/unified-search.ts";
import { aniListCatalogue, mangaAuthorMatches } from "../src/lib/anilist-catalogue.ts";

test("fragment languages survive preference parsing independently of UI and catalogue", () => {
  const settings = {
    ...emptyPreferences(),
    uiLanguage: "en",
    language: "fr",
    ebookDevices: ["kobo"],
    fragmentLanguages: ["it", "en", "it", "invalid"],
  };
  const result = parsePreferences(settings);
  assert.deepEqual(result.fragmentLanguages, ["en", "it"]);
  assert.equal(result.uiLanguage, "en");
  assert.equal(result.language, "fr");
  assert.deepEqual(result.ebookDevices, ["kobo"]);
  assert.deepEqual(resolveFragmentLanguages(undefined, "it"), ["it"]);
  assert.deepEqual(resolveFragmentLanguages([], "en"), ["en"]);
});
test("multilingual rotation balances languages and visits every work in even-sized pools", () => {
  const pool = [
    ...Array.from({ length: 98 }, (_, i) => ({
      id: `it${i}`,
      title: `Italian ${i}`,
      author: `Author ${i}`,
      language: "it",
    })),
    ...Array.from({ length: 392 }, (_, i) => ({
      id: `en${i}`,
      title: `English ${i}`,
      author: `Writer ${i}`,
      language: "en",
    })),
  ];
  const seen = new Set();
  let previous;
  for (let i = 0; i < 784; i++) {
    const day = new Date(Date.UTC(2026, 9, 26 + i)).toISOString().slice(0, 10),
      q = selectMultilingualFragment(day, pool, ["it", "en"]);
    assert.notEqual(q.language, previous);
    previous = q.language;
    seen.add(q.id);
  }
  assert.equal(seen.size, 490);
  assert.equal(selectMultilingualFragment("2026-10-26", pool, ["it"]).language, "it");
  assert.throws(() => selectMultilingualFragment("2026-02-31", pool, ["it"]));
});
const book = (id, title, authors = ["Kentaro Miura"]) => ({
  id,
  title,
  authors,
  cover_url: null,
  published_year: null,
  page_count: null,
  categories: [],
  description: null,
});
test("unified results prefer a series over individual volumes and preserve unrelated namesakes", () => {
  const result = unifiedSearchResults(
    [
      book("volume", "Berserk Vol. 1"),
      book("namesake", "Berserk", ["Another Author"]),
      book("novel", "A Novel", ["Writer"]),
    ],
    [book("manga:mal:2", "Berserk", ["Kentarou Miura"])],
    "Berserk",
  );
  assert.equal(result[0].id, "manga:mal:2");
  assert.ok(!result.some((b) => b.id === "volume"));
  assert.ok(result.some((b) => b.id === "namesake"));
});
test("manga creator search handles Miura name order and romanization without matching arbitrary terms", async () => {
  assert.ok(mangaAuthorMatches("Kentarou Miura", "Kentaro Miura"));
  assert.ok(mangaAuthorMatches("Kentarou Miura", "Miura Kentaro"));
  assert.equal(mangaAuthorMatches("Kentarou Miura", "Berserk"), false);
  const record = {
    id: 30002,
    idMal: 2,
    title: { english: "Berserk" },
    volumes: null,
    status: "RELEASING",
    isAdult: false,
    format: "MANGA",
    staff: { edges: [{ role: "Story & Art", node: { name: { full: "Kentarou Miura" } } }] },
  };
  const rows = await aniListCatalogue({ query: "Kentaro Miura" }, async () =>
    Response.json({
      data: {
        Page: { media: [] },
        authors: {
          staff: [
            {
              name: { full: "Kentarou Miura" },
              staffMedia: { nodes: [record, { ...record, id: 1, idMal: 1, isAdult: true }] },
            },
          ],
        },
      },
    }),
  );
  assert.deepEqual(
    rows.map((b) => b.id),
    ["manga:mal:2"],
  );
});
test("unified search collapses volumes with native-script author aliases, including multi-digit volumes", () => {
  const manga = {
    ...book("manga:mal:2", "Berserk", ["Kentarou Miura"]),
    author_aliases: ["三浦建太郎"],
  };
  const results = unifiedSearchResults(
    [
      book("jp", "Berserk 13", ["三浦建太郎"]),
      book("deluxe", "Berserk Deluxe Volume 1", ["三浦建太郎"]),
    ],
    [manga],
    "Berserk",
  );
  assert.deepEqual(
    results.map((b) => b.id),
    ["manga:mal:2"],
  );
});
test("creator searches put the creator's own works ahead of biographies and collections mentioning the name", () => {
  const results = unifiedSearchResults(
    [book("bio", "Berserk: Kentaro Miura", ["Jeremy Mark Robinson"])],
    [book("manga:mal:2", "Berserk", ["Kentarou Miura"])],
    "Kentaro Miura",
  );
  assert.equal(results[0].id, "manga:mal:2");
});
test("search retains owned MangaDex IDs when another provider returns the same work", async () => {
  const { preferOwnedManga } = await import("../src/lib/unified-search.ts");
  const owned = book("manga:md:6b1eb93e-473a-4ab3-9922-1a66d2a29a4a", "Berserk", ["Kentaro Miura"]);
  const remote = {
    ...book("manga:mal:2", "Berserk", ["Kentarou Miura"]),
    manga: {
      malId: 2,
      status: "ongoing",
      totalVolumes: null,
      source: "https://anilist.co/manga/30002",
    },
  };
  assert.equal(preferOwnedManga([remote], [owned])[0].id, owned.id);
  assert.equal(
    preferOwnedManga([remote], [{ ...owned, authors: ["Another Author"] }])[0].id,
    remote.id,
  );
});
test("sharing a first name alone does not merge distinct authors' books", () => {
  const rows = unifiedSearchResults(
    [book("other", "Example", ["John Smith"])],
    [book("manga:mal:99", "Example", ["John Jones"])],
    "Example",
  );
  assert.equal(rows.length, 2);
});
