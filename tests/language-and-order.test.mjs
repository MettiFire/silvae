import test from "node:test";
import assert from "node:assert/strict";
import {
  browserBookLanguage,
  parseBookLanguage,
  resolveBookLanguage,
  applyBookLanguage,
} from "../src/lib/book-language.ts";
import { parsePreferences, emptyPreferences } from "../src/lib/reading-preferences.ts";
import { sortLibrary, hasReadBook } from "../src/lib/library-order.ts";
import { getAuthorBooks } from "../src/lib/authors.ts";
test("browser locale seeds the book language and explicit or all-language choices override it", () => {
  assert.equal(browserBookLanguage("it-IT"), "it");
  assert.equal(browserBookLanguage("en_US"), "en");
  assert.equal(resolveBookLanguage("auto", "fr-CA"), "fr");
  assert.equal(resolveBookLanguage("it", "en-US"), "it");
  assert.equal(resolveBookLanguage("any", "it-IT"), undefined);
  assert.equal(parseBookLanguage("invalid"), "auto");
  assert.equal(browserBookLanguage("invalid"), "en");
  const old = { ...emptyPreferences(), status: "completed", liked: ["fiction"] };
  delete old.language;
  assert.equal(parsePreferences(old).language, "auto");
});
test("language filters reach both catalogue providers without losing the search query", () => {
  const google = new URLSearchParams({ q: "subject:fiction" });
  applyBookLanguage(google, "google", "it");
  assert.equal(google.get("langRestrict"), "it");
  assert.equal(google.get("q"), "subject:fiction");
  const ol = new URLSearchParams({ q: "author_key:OL1A" });
  applyBookLanguage(ol, "openlibrary", "it");
  assert.equal(ol.get("q"), "author_key:OL1A language:ita");
  assert.equal(ol.get("lang"), "it");
  const all = new URLSearchParams();
  applyBookLanguage(all, "openlibrary");
  assert.equal(all.toString(), "");
});
const b = (id, title = "A book", author = "Writer") => ({
  id,
  title,
  authors: [author],
  categories: [],
  cover_url: null,
  page_count: 200,
  published_year: 2020,
  description: null,
});
const row = (id, finished, extra = {}) => ({
  book_id: id,
  status: "read",
  books: b(id),
  finished_at: finished,
  last_reread_at: null,
  created_at: "2026-01-01",
  updated_at: "2026-10-21",
  ...extra,
});
test("chronological library order follows completion and rereads, not edits, with missing dates last", () => {
  const items = [
    row("old", "2020-01-01", { updated_at: "2030-01-01" }),
    row("unknown", null),
    row("reread", "2010-01-01", { last_reread_at: "2026-09-01" }),
    row("recent", "2026-10-01"),
  ];
  assert.deepEqual(
    sortLibrary(items, "last-read").map((x) => x.book_id),
    ["recent", "reread", "old", "unknown"],
  );
  assert.deepEqual(
    sortLibrary(items, "first-read").map((x) => x.book_id),
    ["old", "reread", "recent", "unknown"],
  );
  assert.equal(items[0].book_id, "old");
});
test("read badge matches stable ids, imported ISBNs and verified editions but never unread books or wrong authors", () => {
  const book = b("ol:OL1W");
  assert.ok(hasReadBook(book, [row(book.id, null, { books: null })]));
  assert.ok(
    hasReadBook({ ...book, isbns: ["9780000000001"] }, [
      row("csv:isbn:9780000000001", null, { books: null }),
    ]),
  );
  assert.ok(hasReadBook(book, [row("google:edition", null)]));
  assert.ok(!hasReadBook(book, [row(book.id, null, { status: "to_read" })]));
  assert.ok(
    !hasReadBook(book, [row("other", null, { books: b("other", "A book", "Other Writer") })]),
  );
});
test("author popularity sorts the full catalogue by library additions with a source count", async (t) => {
  const previous = global.fetch;
  t.after(() => (global.fetch = previous));
  global.fetch = async (url) => {
    const p = new URL(url).searchParams;
    assert.equal(p.get("sort"), "readinglog");
    assert.equal(p.get("offset"), "24");
    return {
      ok: true,
      json: async () => ({
        numFound: 30,
        docs: [
          {
            key: "/works/OL1W",
            title: "Book",
            author_name: ["Writer"],
            readinglog_count: 500,
            isbn: ["9780000000001"],
          },
        ],
      }),
    };
  };
  const result = await getAuthorBooks("OL1A", 1, "popular");
  assert.equal(result.books[0].reading_count, 500);
  assert.deepEqual(result.books[0].isbns, ["9780000000001"]);
});
