import test from "node:test";
import assert from "node:assert/strict";
import {
  parsePreferences,
  recommendationPlan,
  rankRecommendations,
  emptyPreferences,
} from "../src/lib/reading-preferences.ts";
const book = (id, categories = ["Fantasy"], extra = {}) => ({
  id,
  title: id,
  authors: [id + " author"],
  categories,
  cover_url: null,
  page_count: 300,
  published_year: 2020,
  description: null,
  ...extra,
});
const row = (b, rating, extra = {}) => ({
  book_id: b.id,
  books: b,
  rating,
  status: "read",
  favorite: false,
  ...extra,
});
const prefs = (extra = {}) => ({
  ...emptyPreferences(),
  status: "completed",
  liked: ["fantasy"],
  ...extra,
});
test("new account receives candidates without community or library data", () => {
  assert.deepEqual(
    recommendationPlan(prefs(), []).map((g) => g.id),
    ["fantasy"],
  );
  assert.ok(recommendationPlan(null, []).length >= 3);
});
test("validates persisted preferences, caps choices and removes conflicting exclusions", () => {
  assert.equal(parsePreferences({ version: 1, status: "completed", liked: [] }), null);
  assert.deepEqual(
    parsePreferences(
      prefs({
        liked: ["fantasy", "fantasy", "invalid"],
        avoided: ["fantasy", "horror"],
        length: "invalid",
      }),
    ),
    prefs({ avoided: ["horror"] }),
  );
});
test("low-rated books do not create a positive taste signal", () => {
  const plan = recommendationPlan(null, [row(book("bad", ["Poetry"]), 1)]);
  assert.ok(!plan.some((g) => g.id === "poetry"));
  assert.ok(
    recommendationPlan(null, [row(book("good", ["Poetry"]), 5)]).some((g) => g.id === "poetry"),
  );
});
test("explicit avoided genres are excluded despite library favourites", () => {
  assert.ok(
    !recommendationPlan(prefs({ avoided: ["horror"] }), [
      row(book("h", ["Horror"]), 5, { favorite: true }),
    ]).some((g) => g.id === "horror"),
  );
  assert.equal(
    rankRecommendations(
      [{ book: book("h", ["Horror"]), genreId: "fantasy" }],
      prefs({ avoided: ["horror"] }),
      [],
      [],
    ).length,
    0,
  );
});
test("deduplicates editions and excludes owned works and dismissed ids", () => {
  const a = book("one");
  const b = { ...a, id: "two" };
  assert.equal(
    rankRecommendations(
      [
        { book: a, genreId: "fantasy" },
        { book: b, genreId: "fantasy" },
      ],
      prefs(),
      [],
      [],
    ).length,
    1,
  );
  assert.equal(
    rankRecommendations([{ book: b, genreId: "fantasy" }], prefs(), [row(a, 5)], []).length,
    0,
  );
  assert.equal(
    rankRecommendations([{ book: a, genreId: "fantasy" }], prefs(), [], ["one"]).length,
    0,
  );
});
test("length preference influences ranking without hiding books with missing page counts", () => {
  const candidates = [
    { book: book("long", [], { page_count: 600 }), genreId: "fantasy" },
    { book: book("short", [], { page_count: 100 }), genreId: "fantasy" },
    { book: book("unknown", [], { page_count: null }), genreId: "fantasy" },
  ];
  assert.equal(
    rankRecommendations(candidates, prefs({ length: "short" }), [], [])[0].book.id,
    "short",
  );
  assert.equal(rankRecommendations(candidates, prefs({ length: "short" }), [], []).length, 3);
});
test("mixes genres rather than filling the feed from the first catalogue query", () => {
  const c = [
    ...Array.from({ length: 10 }, (_, i) => ({ book: book("f" + i), genreId: "fantasy" })),
    { book: book("m", ["Mystery"]), genreId: "mystery" },
  ];
  assert.ok(
    rankRecommendations(c, prefs({ liked: ["fantasy", "mystery"] }), [], [], 3).some(
      (x) => x.book.id === "m",
    ),
  );
});

test("science exclusion does not exclude science fiction and fallback always has candidates", () => {
  const choices = prefs({ liked: ["scifi"], avoided: ["science"] });
  assert.equal(
    rankRecommendations(
      [{ book: book("space", ["Science Fiction"]), genreId: "scifi" }],
      choices,
      [],
      [],
    ).length,
    1,
  );
  assert.ok(
    recommendationPlan(
      prefs({
        liked: ["poetry"],
        avoided: ["literary", "fantasy", "mystery", "biography", "science"],
      }),
      [
        row(book("bad", ["Poetry"]), 1),
        row(book("bad2", ["Poetry"]), 1),
        row(book("bad3", ["Poetry"]), 1),
      ],
    ).length > 0,
  );
});

test("broad science search results do not label science fiction as science and nature", () => {
  const result = rankRecommendations(
    [
      { book: book("novel", ["Science Fiction", "Science"]), genreId: "science" },
      { book: book("generic-fiction", ["Fiction", "Science"]), genreId: "science" },
      { book: book("biology", ["Science", "Biology"]), genreId: "science" },
    ],
    null,
    [],
    [],
  );
  assert.deepEqual(
    result.map((x) => x.book.id),
    ["biology"],
  );
});

test("read, reading and unread books all inform genre and author candidate sources", async () => {
  const { recommendationSources, libraryInterest } =
    await import("../src/lib/reading-preferences.ts");
  for (const status of ["read", "reading", "to_read"]) {
    const entry = row(book("interest", ["Poetry"], { authors: ["Poet Example"] }), null, {
      status,
    });
    assert.ok(libraryInterest(entry) > 0);
    assert.ok(recommendationPlan(null, [entry]).some((g) => g.id === "poetry"));
    assert.ok(
      recommendationSources(null, [entry]).some((s) => s.query === 'inauthor:"Poet Example"'),
    );
  }
  const unknown = row(book("uncategorized", [], { authors: ["Writer Example"] }), null, {
    status: "to_read",
  });
  assert.ok(recommendationSources(null, [unknown]).some((s) => s.author === "Writer Example"));
  assert.equal(libraryInterest({ ...unknown, status: "abandoned" }), 0);
});
test("unread authors influence ranking without being described as already enjoyed", () => {
  const interest = row(book("owned", ["Poetry"], { authors: ["Writer"] }), null, {
    status: "to_read",
  });
  const list = [
    { book: book("unrelated", ["Poetry"]), genreId: "poetry" },
    { book: book("new", ["Poetry"], { authors: ["Writer"] }), genreId: "poetry" },
  ];
  const result = rankRecommendations(list, null, [interest], []);
  assert.equal(result[0].book.id, "new");
  assert.match(result[0].reason, /vuoi leggere/);
  assert.ok(!result.some((x) => x.book.id === "owned"));
});
test("high ratings are stronger than unread interest and low ratings stay negative", async () => {
  const { libraryInterest, recommendationSources } =
    await import("../src/lib/reading-preferences.ts");
  const unread = row(book("wanted"), null, { status: "to_read" });
  assert.ok(libraryInterest(row(book("loved"), 5)) > libraryInterest(unread));
  assert.ok(libraryInterest({ ...unread, rating: 1 }) < 0);
  assert.ok(!recommendationSources(null, [{ ...unread, rating: 1 }]).some((s) => s.author));
});
