import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSearchQuery, searchProviders, ownedBookSuggestions } from "../src/lib/search-policy.ts";
test("whitespace and case variants reuse the same search", () => {
  assert.equal(normalizeSearchQuery("  Stephen   KING "), "stephen king");
  assert.equal(normalizeSearchQuery("It"), normalizeSearchQuery(" it "));
});
test("manga-only search does not request books or authors", () => {
  assert.deepEqual(searchProviders("manga", "naruto", true), { books: false, manga: true, authors: false });
  assert.deepEqual(searchProviders("books", "sapiens", true), { books: true, manga: false, authors: true });
  assert.deepEqual(searchProviders("all", "9781234567890", true), { books: true, manga: false, authors: false });
  assert.deepEqual(searchProviders("all", "it", false), { books: false, manga: false, authors: false });
});
test("owned exact titles appear first without unrelated short-word matches", () => {
  const book = (id, title) => ({ id, title, authors: ["Stephen King"], cover_url: null });
  const result = ownedBookSuggestions([book("a", "Italian edition"), book("b", "It ends with us"), book("c", "It"), book("manga:1", "It")], "it", false);
  assert.deepEqual(result.map(b => b.id), ["c", "b"]);
});