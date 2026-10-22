import test from "node:test";
import assert from "node:assert/strict";
import { authorSearchResults } from "../src/lib/author-search.ts";
const author = (id, name, birth, workCount) => ({ id, name, birth, workCount, topWork: null });
test("Search removes sparse duplicate author records and retains the identified author", () => {
  const results = authorSearchResults([
    author("a", "Italo Calvino", null, 1),
    author("b", "Italo Calvino", "1923", 500),
    author("c", "italo calvino", null, 2),
  ]);
  assert.deepEqual(
    results.map((a) => a.id),
    ["b"],
  );
});
test("Search keeps biographically distinct namesakes and chooses the fullest duplicate", () => {
  const results = authorSearchResults([
    author("a", "John Smith", "1950", 10),
    author("b", "John Smith", "1950", 20),
    author("c", "John Smith", "1980", 5),
    author("d", "Other Author", null, 2),
  ]);
  assert.deepEqual(
    results.map((a) => a.id),
    ["b", "c", "d"],
  );
});
test("An exact author query excludes conferences merely mentioning the author's name", () => {
  const results = authorSearchResults(
    [
      author("a", "Italo Calvino", "1923", 500),
      author("b", "Simposio in memoria di Italo Calvino", null, 1),
    ],
    3,
    "Italo Calvino",
  );
  assert.deepEqual(
    results.map((a) => a.id),
    ["a"],
  );
});
