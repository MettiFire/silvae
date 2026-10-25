import test from "node:test";
import assert from "node:assert/strict";
import { bookGridCapacity } from "../src/lib/book-grid-size.ts";
import { rankRecommendations } from "../src/lib/reading-preferences.ts";
test("compact desktop suggestions fill both ten-column rows rather than stopping at twelve", () => {
  assert.equal(bookGridCapacity("compact", 1920), 20);
  assert.equal(bookGridCapacity("standard", 1920), 12);
  assert.equal(bookGridCapacity("large", 1920), 8);
});
test("capacity follows CSS breakpoint boundaries and preserves whole rows on smaller screens", () => {
  for (const [width, expected] of [
    [375, [4, 6, 8]],
    [639, [4, 6, 8]],
    [640, [6, 8, 12]],
    [1023, [6, 8, 12]],
    [1024, [8, 12, 20]],
  ]) {
    assert.deepEqual(
      ["large", "standard", "compact"].map((d) => bookGridCapacity(d, width)),
      expected,
    );
    for (const density of ["large", "standard", "compact"])
      assert.equal(bookGridCapacity(density, width, 1) * 2, bookGridCapacity(density, width));
  }
});
test("ranking can supply twenty distinct candidates while preserving dismissed exclusions", () => {
  const candidates = Array.from({ length: 30 }, (_, i) => ({
    book: {
      id: `book-${i}`,
      title: `Novel ${i}`,
      authors: [`Author ${i}`],
      cover_url: null,
      categories: ["Fiction"],
      page_count: 200,
      published_year: 2020,
      description: null,
    },
    genreId: "fiction",
  }));
  const result = rankRecommendations(
    candidates,
    null,
    [],
    ["book-0"],
    bookGridCapacity("compact", 1920),
    0,
    {},
  );
  assert.equal(result.length, 20);
  assert.equal(new Set(result.map((r) => r.book.id)).size, 20);
  assert.equal(
    result.some((r) => r.book.id === "book-0"),
    false,
  );
});
