import test from "node:test";
import assert from "node:assert/strict";
import {
  sameReadingWork,
  canRecommendWork,
  workTitle,
  sameAuthorName,
} from "../src/lib/work-identity.ts";
import { resolveWork, matchWorkDocuments } from "../src/lib/resolve-work.ts";
import { rankRecommendations } from "../src/lib/reading-preferences.ts";
const book = (id, title, authors = ["J. R. R. Tolkien"]) => ({
  id,
  title,
  authors,
  categories: ["Fantasy"],
  page_count: 300,
});
const italian = book("bookshelf-fellowship", "La compagnia dell'anello. Il Signore degli anelli", [
  "John R. R. Tolkien",
]);
const english = book("google-fellowship", "The Fellowship of the Ring");
const identity = (work, title) => ({ workIds: [work], titles: [title], verified: true });
const identities = {
  [italian.id]: identity("OL1W", "The Fellowship of the Ring"),
  [english.id]: identity("OL1W", "The Fellowship of the Ring"),
  towers: identity("OL2W", "The Two Towers"),
};
test("Different languages and provider editions of an owned work are excluded everywhere", () => {
  assert.equal(sameReadingWork(italian, english, identities), true);
  assert.equal(canRecommendWork(english, [italian], identities), false);
  assert.equal(canRecommendWork(book("ol:OL1W", "Die Gefährten"), [italian], identities), false);
  for (const status of ["read", "reading", "to_read", "abandoned"]) {
    assert.deepEqual(
      rankRecommendations(
        [{ book: english, genreId: "fantasy" }],
        null,
        [{ book_id: italian.id, books: italian, status }],
        [],
        12,
        0,
        identities,
      ),
      [],
    );
  }
});
test("Edition labels and author initials match without confusing sequels or other authors", () => {
  assert.equal(
    workTitle("La compagnia dell'anello. Il Signore degli anelli"),
    workTitle("La compagnia dell’anello"),
  );
  for (const title of [
    "La compagnia dell'anello (edizione illustrata)",
    "La compagnia dell'anello: nuova edizione",
  ]) {
    assert.equal(sameReadingWork(italian, book("edition", title)), true);
  }
  assert.equal(sameAuthorName("John Ronald Reuel Tolkien", "J.R.R. Tolkien"), true);
  assert.equal(sameAuthorName("Tolkien, J. R. R.", "John R. R. Tolkien"), true);
  assert.equal(
    sameReadingWork(
      book("a", "Dune", ["Frank Herbert"]),
      book("b", "Dune: Messiah", ["Frank Herbert"]),
    ),
    false,
  );
  assert.equal(
    sameReadingWork(book("a", "Home", ["Author One"]), book("b", "Home", ["Author Two"])),
    false,
  );
  assert.equal(canRecommendWork(book("towers", "The Two Towers"), [italian], identities), true);
});
test("Unresolved same-author works stay out during loading or provider outages", () => {
  assert.equal(canRecommendWork(english, [italian]), false);
  assert.equal(
    canRecommendWork(english, [italian], { [english.id]: identities[english.id] }),
    false,
  );
  assert.equal(canRecommendWork(book("other", "A new novel", ["Other Author"]), [italian]), true);
});
test("Translated titles obtained from a matching edition resolve to their canonical work", async () => {
  let calls = 0;
  const result = await resolveWork(italian, async (url) => {
    calls++;
    assert.equal(new URL(url).searchParams.get("q"), `"La compagnia dell'anello" author:tolkien`);
    return Response.json({
      docs: [
        {
          key: "/works/OL1W",
          title: "The Fellowship of the Ring",
          author_name: ["J. R. R. Tolkien"],
          editions: { docs: [{ title: "La compagnia dell'anello" }] },
        },
      ],
    });
  });
  assert.equal(result.verified, true);
  assert.deepEqual(result.workIds, ["OL1W"]);
  assert.equal(calls, 1);
  assert.equal(sameReadingWork(italian, english, { [italian.id]: result }), true);
});
test("ISBN lookups and existing work IDs do not depend on translated title spellings", async () => {
  const isbnBook = { ...italian, isbns: ["9780547928210"] };
  const result = await resolveWork(isbnBook, async () =>
    Response.json({
      docs: [{ key: "/works/OL1W", title: "Different title", isbn: ["9780547928210"] }],
    }),
  );
  assert.equal(result.verified, true);
  const direct = await resolveWork(book("ol:OL1W", "Translated title"), async () => {
    throw Error("Unexpected request");
  });
  assert.deepEqual(direct.workIds, ["OL1W"]);
});
test("Ambiguous catalogues, wrong authors, wrong titles and upstream errors do not create identities", async () => {
  const valid = { key: "/works/OL1W", title: italian.title, author_name: ["J. R. R. Tolkien"] };
  assert.equal(
    matchWorkDocuments(italian, [valid, { ...valid, key: "/works/OL2W" }]).verified,
    false,
  );
  assert.equal(
    matchWorkDocuments(italian, [{ ...valid, author_name: ["Other Author"] }]).verified,
    false,
  );
  assert.equal(
    matchWorkDocuments(italian, [{ ...valid, title: "A guide to The Fellowship of the Ring" }])
      .verified,
    false,
  );
  await assert.rejects(
    resolveWork(italian, async () => new Response("", { status: 503 })),
    /non disponibile/,
  );
});
test("Recommendation feed contains at most one language/edition of a verified work", () => {
  const result = rankRecommendations(
    [
      { book: english, genreId: "fantasy" },
      { book: italian, genreId: "fantasy" },
    ],
    null,
    [],
    [],
    12,
    0,
    identities,
  );
  assert.equal(result.length, 1);
});

test("Different full first names do not become the same author through shared initials", () => {
  assert.equal(sameAuthorName("John Smith", "James Smith"), false);
  assert.equal(sameAuthorName("John Smith", "J. Smith"), true);
});

test("catalogue duplicates that add a leading article do not become another unread work", () => {
  const current=book("ol:OL40567956W","Decameron",["Giovanni Boccaccio"]);
  const duplicate=book("ol:OL7180368W","The Decameron",["Giovanni Boccaccio"]);
  assert.equal(sameReadingWork(current,duplicate),true);
  assert.equal(canRecommendWork(duplicate,[current]),false);
  assert.equal(sameReadingWork(book("one","La casa",["Author One"]),book("two","Casa",["Author Two"])),false);
});

test("publisher-added author attribution is not a distinct unread work", () => {
  const current=book("ol:OL40567956W","Decameron",["Giovanni Boccaccio"]);
  assert.equal(canRecommendWork(book("ol:OL27738190W","The Decameron of Giovanni Boccaccio",["Giovanni Boccaccio"]),[current]),false);
  assert.equal(sameReadingWork(book("a","A Portrait of the Artist",["James Joyce"]),book("b","A Portrait",["James Joyce"])),false);
});
