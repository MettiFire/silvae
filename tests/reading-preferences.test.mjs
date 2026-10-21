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
