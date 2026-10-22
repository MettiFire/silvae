import test from "node:test";
import assert from "node:assert/strict";
import { readingStatistics } from "../src/lib/reading-statistics.ts";
const book = (id, finished_at, extra = {}) => ({
  id,
  book_id: id,
  status: "read",
  finished_at,
  started_at: null,
  total_pages: 200,
  rating: null,
  reread_count: 0,
  books: { authors: ["Author"], categories: [], page_count: 200 },
  ...extra,
});
test("Annual history preserves imported calendar years and excludes undated or future completions", () => {
  const s = readingStatistics(
    [
      book("a", "2024-12-31T23:00:00-08:00"),
      book("b", "2025-01-01"),
      book("c", null),
      book("d", "2027-01-01"),
      book("e", "2024-02-31"),
      book("f", "2024-04-01", { status: "reading" }),
    ],
    2024,
    "2026-10-22",
  );
  assert.deepEqual(
    s.byYear.map((y) => [y.year, y.libri]),
    [
      [2026, 0],
      [2025, 1],
      [2024, 1],
    ],
  );
  assert.equal(s.byMonth[11].libri, 1);
  assert.equal(s.undated, 3);
  assert.equal(s.read.length, 5);
});
test("Yearly pages do not invent reread dates, and unrated books do not dilute ratings", () => {
  const s = readingStatistics(
    [
      book("a", "2025-06-01", { reread_count: 3, rating: 4 }),
      book("b", "2025-07-01", { rating: 0, total_pages: 100 }),
      book("c", null, {
        total_pages: 0,
        books: { authors: ["Author"], categories: [], page_count: 0 },
      }),
    ],
    2025,
    "2026-10-22",
  );
  assert.equal(s.byYear.find((y) => y.year === 2025).pages, 300);
  assert.equal(s.avgRating, "2.0");
  assert.equal(s.avgPages, 150);
  assert.equal(s.pace, null);
});
