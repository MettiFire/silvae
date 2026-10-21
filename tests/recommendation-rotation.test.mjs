import test from "node:test";
import assert from "node:assert/strict";
import { advanceRotation, nextRecommendationRotation } from "../src/lib/recommendation-rotation.ts";
test("refresh advances a persisted rotation and uses a different candidate page", (t) => {
  const old = global.sessionStorage;
  let raw = null;
  global.sessionStorage = { getItem: () => raw, setItem: (_, value) => (raw = value) };
  t.after(() => {
    if (old === undefined) delete global.sessionStorage;
    else global.sessionStorage = old;
  });
  const first = nextRecommendationRotation();
  const second = nextRecommendationRotation();
  assert.equal(second, advanceRotation(first));
  assert.notEqual(first % 5, second % 5);
});
test("invalid rotation and unavailable storage remain safe", (t) => {
  assert.equal(
    advanceRotation(NaN, () => 0.5),
    500000,
  );
  assert.equal(advanceRotation(999999), 0);
  const old = global.sessionStorage;
  global.sessionStorage = {
    getItem: () => {
      throw Error("blocked");
    },
    setItem: () => {
      throw Error("blocked");
    },
  };
  t.after(() => {
    if (old === undefined) delete global.sessionStorage;
    else global.sessionStorage = old;
  });
  assert.ok(Number.isInteger(nextRecommendationRotation()));
});
