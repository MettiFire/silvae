import test from "node:test";
import assert from "node:assert/strict";
import {
  supplementSearch,
  CATALOGUE_SUPPLEMENT,
  SUPPLEMENT_AUTHOR,
  validAuthorId,
} from "../src/lib/catalogue-supplement.ts";
import {
  catalogueCompletionQuery,
  matchesCatalogueCompletion,
  bookSuggestions,
} from "../src/lib/search-suggestions.ts";
import { findAuthors, getAuthor, getAuthorBooks } from "../src/lib/authors.ts";
import { parseFollowedAuthors } from "../src/lib/followed-authors.ts";
test("combined title/author completion finds Portugal without accepting unrelated metadata", () => {
  assert.equal(catalogueCompletionQuery("Cyril Pedrosa - Portu"), "cyril AND pedrosa AND portu*");
  assert.equal(matchesCatalogueCompletion(CATALOGUE_SUPPLEMENT[0], "Cyril Pedrosa - Portu"), true);
  assert.equal(matchesCatalogueCompletion(CATALOGUE_SUPPLEMENT[0], "Portugal Tolkien"), false);
  assert.equal(supplementSearch("Cyril Pedrosa - Portugal")[0].id, "ol:OL19738516W");
  assert.equal(supplementSearch("Il trono del muori").length, 2);
  assert.equal(supplementSearch("9788804808626")[0].id, "TYTe0QEACAAJ");
  assert.deepEqual(supplementSearch("nonsense nonexistent"), []);
  assert.equal(bookSuggestions([...CATALOGUE_SUPPLEMENT, ...CATALOGUE_SUPPLEMENT]).length, 3);
});
test("verified author gaps remain browsable and followable when the provider has no data", async (t) => {
  const old = global.fetch;
  t.after(() => (global.fetch = old));
  global.fetch = async () => new Response('{"docs":[]}');
  assert.equal((await findAuthors("Il Trono del Muori"))[0].id, SUPPLEMENT_AUTHOR.id);
  assert.equal((await getAuthor(SUPPLEMENT_AUTHOR.id)).name, SUPPLEMENT_AUTHOR.name);
  const result = await getAuthorBooks(SUPPLEMENT_AUTHOR.id, 0, "new");
  assert.equal(result.total, 2);
  assert.equal(result.books[0].id, "TYTe0QEACAAJ");
  assert.equal((await getAuthorBooks(SUPPLEMENT_AUTHOR.id, 1, "new")).books.length, 0);
  assert.equal(
    parseFollowedAuthors([{ ...SUPPLEMENT_AUTHOR, followedAt: "2026-10-25T12:00:00Z" }]).length,
    1,
  );
  assert.equal(validAuthorId("catalogue:invented-person"), false);
});
test("the missing Italian Portugal edition appears in the verified author's bibliography", async (t) => {
  const old = global.fetch;
  t.after(() => (global.fetch = old));
  global.fetch = async () => new Response('{"docs":[],"numFound":0}');
  const result = await getAuthorBooks("OL3144540A", 0, "popular", { language: "it" });
  assert.equal(result.books[0].title, "Portugal");
  assert.equal((await getAuthorBooks("OL123A", 0, "popular", { language: "it" })).books.length, 0);
});
