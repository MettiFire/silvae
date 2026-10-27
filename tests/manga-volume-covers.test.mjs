import test from "node:test";
import assert from "node:assert/strict";
import { fetchMangaCovers } from "../src/lib/manga-catalogue.ts";
import { mangaVolumeCovers, usesPersonalMangaNumbering } from "../src/lib/manga-model.ts";
const record = (volume, fileName = `${volume}.jpg`, locale = "ja") => ({
  attributes: { volume: String(volume), fileName, locale },
});

test("legacy edition labels do not hide covers when catalogue numbering agrees", () => {
  const manga = { totalVolumes: 22, status: "completed", source: "mal" };
  const progress = { total: 22, edition: "Italiana", ranges: [[1, 22]], updatedAt: "2026-10-27" };
  assert.equal(usesPersonalMangaNumbering(progress, manga), false);
  assert.equal(usesPersonalMangaNumbering({ ...progress, total: 11 }, manga), true);
  assert.equal(usesPersonalMangaNumbering({ ...progress, total: null }, manga), true);
  assert.equal(usesPersonalMangaNumbering({ ...progress, total: null, edition: "" }, manga), false);
});

test("volume images retain alternate files and sizes without borrowing another volume's cover", () => {
  const covers = mangaVolumeCovers(
    [
      record(1, "ja.jpg"),
      record(1, "it.jpg", "it"),
      record(2, "two.jpg"),
      record("1.5", "extra.jpg"),
    ],
    "series",
    "it",
  );
  assert.equal(covers.length, 2);
  assert.match(covers[0].url, /it.jpg.256.jpg$/);
  assert.ok(covers[0].cover_candidates.some((url) => url.endsWith("it.jpg.512.jpg")));
  assert.ok(covers[0].cover_candidates.some((url) => url.endsWith("/it.jpg")));
  assert.ok(covers[0].cover_candidates.some((url) => url.includes("ja.jpg")));
  assert.ok(
    covers[0].cover_candidates.every(
      (url) => !url.includes("two.jpg") && !url.includes("extra.jpg"),
    ),
  );
});

test("the catalogue reads past 400 records and shares concurrent requests", async (t) => {
  const old = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = old;
  });
  const offsets = [];
  globalThis.fetch = async (url) => {
    assert.equal(new URL(url).hostname, "silvae-catalogue.vercel.app");
    assert.equal(new URL(url).searchParams.get("resource"), "/cover");
    const offset = Number(new URL(url).searchParams.get("offset"));
    offsets.push(offset);
    return Response.json({
      total: 520,
      data: Array.from({ length: Math.min(100, 520 - offset) }, (_, i) => record(offset + i + 1)),
    });
  };
  const input = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", title: "Test", language: "it" };
  const [a, b] = await Promise.all([fetchMangaCovers(input), fetchMangaCovers(input)]);
  assert.equal(a.length, 520);
  assert.equal(b.length, 520);
  assert.deepEqual(offsets, [0, 100, 200, 300, 400, 500]);
});

test("later page failures retain usable covers and retries can recover the missing volumes", async (t) => {
  const old = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = old;
  });
  let failing = true;
  globalThis.fetch = async (url) => {
    const offset = Number(new URL(url).searchParams.get("offset"));
    if (offset === 100 && failing) return new Response("offline", { status: 503 });
    return Response.json({
      total: 120,
      data: Array.from({ length: Math.min(100, 120 - offset) }, (_, i) => record(offset + i + 1)),
    });
  };
  const input = { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", title: "Test", language: "it" };
  assert.equal((await fetchMangaCovers(input)).length, 100);
  failing = false;
  assert.equal((await fetchMangaCovers(input)).length, 120);
});

test("translated titles resolve with canonical aliases and empty results do not poison the cache", async (t) => {
  const old = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = old;
  });
  let found = false;
  globalThis.fetch = async (url) => {
    const parsed = new URL(url);
    if (parsed.searchParams.get("resource") === "/manga") {
      assert.equal(parsed.searchParams.get("title"), "Attack on Titan");
      return Response.json({
        data: found
          ? [
              {
                id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                attributes: { title: { en: "Attack on Titan" }, links: { mal: "23390" }, tags: [] },
              },
            ]
          : [],
      });
    }
    return Response.json({ total: 1, data: [record(1)] });
  };
  const input = { malId: 23390, title: "L’attacco dei giganti", language: "it" };
  assert.deepEqual(await fetchMangaCovers(input), []);
  found = true;
  assert.equal((await fetchMangaCovers(input)).length, 1);
});
