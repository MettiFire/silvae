import test from "node:test";
import assert from "node:assert/strict";
import { dailyFragment, fragmentDay } from "../src/lib/daily-fragment.ts";
import { DAILY_FRAGMENTS } from "../src/data/daily-fragments.ts";
test("Daily fragments use the Rome calendar day including DST and remain stable", () => {
  assert.equal(fragmentDay(new Date("2026-10-22T22:30:00Z")), "2026-10-23");
  assert.deepEqual(dailyFragment("2026-10-23"), dailyFragment("2026-10-23"));
  assert.throws(() => dailyFragment("2026-02-31"));
});
test("Daily selection covers the full pool per cycle and never repeats on adjacent days", () => {
  const n = DAILY_FRAGMENTS.length,
    start = Math.floor(Date.parse("2026-01-01") / 86400000 / n) * n;
  let previous;
  for (let cycle = 0; cycle < 8; cycle++) {
    const ids = [];
    for (let i = 0; i < n; i++) {
      const id = dailyFragment(
        new Date((start + cycle * n + i) * 86400000).toISOString().slice(0, 10),
      ).id;
      assert.notEqual(id, previous);
      previous = id;
      ids.push(id);
    }
    assert.equal(new Set(ids).size, n);
  }
  assert.ok(
    DAILY_FRAGMENTS.every(
      (q) =>
        new URL(q.source).hostname === "it.wikisource.org" && q.author && q.title && q.section && q.theme && q.heading && q.note,
    ),
  );
});
