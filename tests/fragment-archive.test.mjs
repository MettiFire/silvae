import test from "node:test";
import assert from "node:assert/strict";
import {
  selectArchiveFragment,
  archiveWorkOrder,
  fragmentWorkKey,
  validArchive,
} from "../src/lib/fragment-archive.ts";
import { parseWikiquote } from "../scripts/fragments/wikiquote-parser.mjs";
const entry = (id, author, title) => ({ id, author, title });
test("archive chooses works, not quotes, and spaces all books across cycle boundaries", () => {
  const pool = Array.from({ length: 210 }, (_, i) =>
    entry(`b${i}`, `Author ${i % 30}`, `Book ${i}`),
  );
  pool.push({ ...pool[0], id: "extra" });
  const last = new Map();
  for (let i = 0; i < 900; i++) {
    const day = new Date(Date.UTC(2026, 9, 26 + i)).toISOString().slice(0, 10);
    const q = selectArchiveFragment(day, pool),
      key = fragmentWorkKey(q.author, q.title);
    if (last.has(key)) assert.ok(i - last.get(key) >= 210);
    last.set(key, i);
    assert.deepEqual(q, selectArchiveFragment(day, pool));
  }
  assert.equal(archiveWorkOrder(pool).length, 210);
  assert.throws(() => selectArchiveFragment("2026-02-31", pool));
  assert.throws(() => selectArchiveFragment("2026-10-26", []));
});
test("balanced catalogues spread authors as well as works", () => {
  const pool = Array.from({ length: 30 }, (_, i) => entry(`${i}`, `Author ${i % 5}`, `Work ${i}`));
  const order = archiveWorkOrder(pool);
  for (let i = 0; i < order.length; i++)
    assert.notEqual(order[i][0].author, order[(i + 1) % order.length][0].author);
});
test("importer ignores unattributed and about-author text, preserves book and pinned source", () => {
  const text = `==Citazioni di Autore==\n*Una frase generica che non deve entrare nella raccolta.\n==''Il libro''==\n===Citazioni===\n*Questa è una [[frase]] abbastanza lunga, davvero presente nel testo originale di questo libro. (p. 12)\n*{{template|Una frase che non possiamo ricostruire.}}\n==Citazioni su Autore==\n*Questa frase riguarda lo scrittore e non è una sua citazione.`;
  const result = parseWikiquote({
    text,
    author: "Autore",
    language: "it",
    page: "Autore",
    revision: 123,
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].title, "Il libro");
  assert.equal(
    result[0].quote,
    "Questa è una frase abbastanza lunga, davvero presente nel testo originale di questo libro.",
  );
  assert.match(result[0].source, /oldid=123/);
  assert.ok(validArchive(result, "it"));
  assert.equal(validArchive(result, "en"), false);
});
test("book pages do not import commentary or unsourced quotations", () => {
  const text = `==Quotes==\n*An original sentence from the book, long enough to appear here as a complete and meaningful quotation.\n==Quotes about the book==\n*This sentence was actually written by a later reviewer of the book.\n==Unsourced==\n*A sentence without any reliable source should never be imported.`;
  const result = parseWikiquote({
    text,
    author: "Writer",
    language: "en",
    page: "A Book",
    revision: 456,
    workTitle: "A Book",
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].title, "A Book");
});
test("archive loader rejects foreign paths and falls back on network or invalid data errors", async () => {
  const { loadFragmentArchive } = await import("../src/lib/fragment-archive.ts");
  await assert.rejects(
    loadFragmentArchive("it", async () =>
      Response.json({
        version: 1,
        languages: { it: { file: "https://evil.example/archive.json" } },
      }),
    ),
    /Invalid fragment manifest/,
  );
  await assert.rejects(
    loadFragmentArchive("it", async () => new Response("error", { status: 503 })),
    /unavailable/,
  );
  let calls = 0;
  await assert.rejects(
    loadFragmentArchive("it", async () =>
      ++calls === 1
        ? Response.json({ version: 1, languages: { it: { file: "it-abcdef012345.json" } } })
        : Response.json([{ quote: "unattributed" }]),
    ),
    /Invalid fragment archive/,
  );
});
test("published language archives load with real manifest paths and retain source provenance", async () => {
  const { readFile } = await import("node:fs/promises");
  const { loadFragmentArchive, validArchive } = await import("../src/lib/fragment-archive.ts");
  for (const language of ["it", "en"]) {
    const entries = await loadFragmentArchive(
      language,
      async (path) => new Response(await readFile(new URL(`../public${path}`, import.meta.url))),
    );
    assert.ok(validArchive(entries, language));
    assert.ok(entries.length > 30);
    assert.equal(new Set(entries.map((e) => e.id)).size, entries.length);
    for (const e of entries) {
      assert.equal(e.workKey, fragmentWorkKey(e.author, e.title));
      assert.equal(new URL(e.source).searchParams.get("oldid"), String(e.revision));
      assert.equal(/[{}\[\]<>|]/.test(e.title + e.quote), false);
    }
  }
});
