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

test("Every rolling window contains distinct works, including rotation boundaries", () => {
  const n = DAILY_FRAGMENTS.length;
  const seen = new Map();
  const start = Date.parse("2026-10-24T00:00:00Z");
  for (let i = 0; i < 1000; i++) {
    const fragment = dailyFragment(new Date(start + i * 86400000).toISOString().slice(0,10));
    const key = `${fragment.author}:${fragment.title}`;
    if (seen.has(key)) assert.ok(i - seen.get(key) >= n);
    seen.set(key, i);
  }
  assert.notEqual(dailyFragment("2026-10-24").title, "Decameron");
});

test("Adding multiple excerpts does not give a book more days in the rotation", async () => {
  const { selectDailyFragment } = await import("../src/lib/daily-fragment.ts");
  const pool = [
    { id:"a1", title:"Un libro", author:"Autore" },
    { id:"b", title:"Altro libro", author:"Altra autrice" },
    { id:"a2", title:"Un líbro!", author:"AUTORE" },
    { id:"c", title:"Terzo libro", author:"Terza autrice" },
  ];
  const ids = Array.from({ length: 6 }, (_, i) => selectDailyFragment(`2026-10-${24+i}`, pool).id);
  assert.deepEqual(ids, ["a1", "b", "c", "a2", "b", "c"]);
  assert.throws(() => selectDailyFragment("2026-10-24", []));
});
