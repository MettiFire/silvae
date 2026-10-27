import test from "node:test";
import assert from "node:assert/strict";
import { bookSuggestions, matchesTitleCompletion, titleCompletionQuery } from "../src/lib/search-suggestions.ts";
const book = (id, title, author = "Frank Herbert", cover_url = null) => ({
  id, title, authors: [author], cover_url, published_year: null, page_count: null,
  categories: [], description: null,
});
test("autocomplete completes a partial final word and treats user syntax as text", () => {
  assert.equal(titleCompletionQuery("La compagn"), "title:(la AND compagn*)");
  assert.equal(titleCompletionQuery("Hàrry Pót"), "title:(harry AND pot*)");
  assert.equal(titleCompletionQuery('Dune) OR *:* (title:"x'), "title:(dune AND or AND title AND x*)");
  assert.equal(titleCompletionQuery(" *** "), "");
});
test("editions collapse before limiting results, retaining all cover choices", () => {
  const input = [book("a", "Dune"), book("b", "Dune (new edition)", "Frank Herbert", "https://example.org/b.jpg"), book("c", "Dune: edizione illustrata", "F. Herbert", "https://example.org/c.jpg"), book("d", "Dune: Messiah"), book("e", "Dune", "Other Author")];
  const result = bookSuggestions(input);
  assert.equal(result.length, 3);
  assert.equal(result[0].id, "b");
  assert.deepEqual(result[0].cover_candidates, ["https://example.org/b.jpg", "https://example.org/c.jpg"]);
  assert.equal(result[1].title, "Dune: Messiah");
  assert.equal(result[2].authors[0], "Other Author");
  assert.equal(input[0].cover_candidates, undefined);
});
test("one Open Library work cannot appear repeatedly under translated edition names", () => {
  const result = bookSuggestions([
    book("ol:OL27513W", "La compagnia dell’anello", "J.R.R. Tolkien"),
    book("ol:OL27513W", "The Fellowship of the Ring", "J.R.R. Tolkien"),
    ...Array.from({length: 10}, (_, i) => book(`other${i}`, `Opera ${i}`)),
  ]);
  assert.equal(result.length, 5);
  assert.equal(result.filter(b => b.id === "ol:OL27513W").length, 1);
});

test("provider fallbacks must match the partial title instead of showing unrelated books", () => {
  assert.equal(matchesTitleCompletion("La compagnia dell’anello", "La compagnia dell an"), true);
  assert.equal(matchesTitleCompletion("Harry Potter and the Philosopher’s Stone", "Harry pot"), true);
  assert.equal(matchesTitleCompletion("Harry Potter", "Harry p"), true);
  assert.equal(matchesTitleCompletion("Items from Italy", "Harry it"), false);
  assert.equal(matchesTitleCompletion("The book of the courtier", "La compagnia dell an"), false);
  assert.equal(matchesTitleCompletion("Dune: Messiah", " *** "), false);
});

test("It matches a whole word, never Italian or items", () => {
  assert.equal(matchesTitleCompletion("It", "It"), true);
  assert.equal(matchesTitleCompletion("It Ends with Us", "It"), true);
  assert.equal(matchesTitleCompletion("Harry Potter Italian Edition", "It"), false);
  assert.equal(matchesTitleCompletion("Items", "It"), false);
  assert.equal(matchesTitleCompletion("Italy", "it"), false);
});

test("series and volume prefixes on duplicate records collapse without merging sequels", () => {
  const result = bookSuggestions([
    book("ol:OL27513W", "La compagnia dell’anello", "J. R. R. Tolkien"),
    book("ol:OL43656271W", "Il signore degli anelli. Parte 1: La compagnia dell’anello", "J.R.R. Tolkien"),
    book("ol:OL2W", "Il signore degli anelli. Parte 2: Le due torri", "J.R.R. Tolkien"),
  ]);
  assert.equal(result.length, 2);
});
