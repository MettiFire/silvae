import test from "node:test";
import assert from "node:assert/strict";
import {
  parseKindleClippings,
  fragmentBookGroup,
  matchFragmentBook,
} from "../src/lib/fragment-import.ts";
import { associateFragmentBooks } from "../src/lib/fragment-book-association.ts";
const book = (
  id,
  title = "La compagnia dell’anello. Il Signore degli anelli",
  authors = ["John R. R. Tolkien"],
) => ({
  id,
  title,
  authors,
  cover_url: null,
  categories: [],
  description: null,
  published_year: null,
  page_count: null,
});
const parse = (heading, quote = "Una frase") =>
  parseKindleClippings(
    `${heading}\n- Your Highlight on page 10 | Location 120-125 | Added on Friday\n\n${quote}\n==========`,
  ).rows[0];

test("Kindle headings match library title variants, reversed names and initials automatically", async () => {
  const row = parse("La compagnia dell'anello (Italian Edition) (Tolkien, J. R. R.)");
  assert.equal(matchFragmentBook(row, [book("owned")]), "owned");
  const result = await associateFragmentBooks([row], [book("owned")], {
    search: async () => {
      throw Error("No catalogue lookup expected");
    },
  });
  assert.equal(result.get(fragmentBookGroup(row)).bookId, "owned");
});
test("An edition label is not parsed as an author; a unique Kindle title can match an owned book", () => {
  const row = parse("La compagnia dell’anello (Italian Edition)");
  assert.deepEqual(row.authors, []);
  assert.equal(matchFragmentBook(row, [book("owned")]), "owned");
  assert.equal(matchFragmentBook(row, [book("one"), book("two")]), "");
});
test("Many highlights trigger one catalogue lookup and reuse an existing fragment book on reimport", async () => {
  const a = parse("New Book (Writer)", "First quote"),
    b = parse("New Book (Writer)", "Second quote");
  let searches = 0;
  const found = book("catalogue", "New Book", ["Writer"]);
  const deps = {
    search: async () => {
      searches++;
      return [found];
    },
  };
  const result = await associateFragmentBooks([a, b], [], deps);
  assert.equal(searches, 1);
  assert.equal(result.get(fragmentBookGroup(a)).bookId, "catalogue");
  await associateFragmentBooks([a, b], [found], deps);
  assert.equal(searches, 1);
});
test("Ambiguous owned editions stay unassigned and do not create another edition", async () => {
  const row = parse("Book (Writer)");
  let calls = 0;
  const result = await associateFragmentBooks(
    [row],
    [book("a", "Book", ["Writer"]), book("b", "Book", ["Writer"])],
    {
      search: async () => {
        calls++;
        return [];
      },
    },
  );
  assert.equal(result.get(fragmentBookGroup(row)).bookId, "");
  assert.equal(calls, 0);
});
test("Translations reuse the existing library book via a verified work identity", async () => {
  const row = parse("The Fellowship of the Ring (J.R.R. Tolkien)");
  const result = await associateFragmentBooks([row], [book("owned")], {
    search: async () => {
      throw Error("Do not search another edition");
    },
    resolve: async (b) => ({
      workIds: ["OL27513W"],
      titles: [b.title, "The Fellowship of the Ring"],
      verified: true,
    }),
  });
  assert.equal(result.get(fragmentBookGroup(row)).bookId, "owned");
});
test("Uncertain matches, missing authors and catalogue outages require a manual choice", async () => {
  const row = parse("Book (Writer)");
  const wrong = await associateFragmentBooks([row], [], {
    search: async () => [book("other", "Book", ["Someone Else"])],
  });
  assert.equal(wrong.get(fragmentBookGroup(row)).bookId, "");
  const failed = await associateFragmentBooks([row], [], {
    search: async () => {
      throw Error("offline");
    },
  });
  assert.equal(failed.get(fragmentBookGroup(row)).bookId, "");
  const missing = parse("Book");
  const noAuthor = await associateFragmentBooks([missing], [], {
    search: async () => [book("a", "Book", ["Writer"])],
  });
  assert.equal(noAuthor.get(fragmentBookGroup(missing)).bookId, "");
});
test("Recognition can stop between book groups without changing reading data", async () => {
  const rows = [parse("A (Writer)"), parse("B (Writer)")];
  let done = false;
  const result = await associateFragmentBooks(rows, [], {
    search: async (row) => [book("one", row.title, row.authors)],
    cancelled: () => done,
    progress: () => {
      done = true;
    },
  });
  assert.equal(result.size, 1);
  assert.ok(!("status" in result.values().next().value));
});

test("Identical titles by different full author names are not treated as interchangeable editions", async () => {
  const row = parse("Book (J. Smith)");
  const result = await associateFragmentBooks([row], [], {
    search: async () => [book("a", "Book", ["John Smith"]), book("b", "Book", ["James Smith"])],
  });
  assert.equal(result.get(fragmentBookGroup(row)).bookId, "");
});
