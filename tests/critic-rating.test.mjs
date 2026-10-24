import test from "node:test";
import assert from "node:assert/strict";
import { parseBookMarksWidget } from "../src/lib/critic-rating.ts";
const html = (grades, count = grades.length, url = "https://bookmarks.reviews/reviews/test-book/") => `<a href="${url}">Book Marks</a><h3>Based on <span class="rave">${count} reviews</h3></span>${grades.map(g => `<span class="stat_total ${g}">${g}</span>`).join("")}`;
test("Critic consensus counts favorable reviews rather than inventing a star grade", () => {
  assert.deepEqual(parseBookMarksWidget(html(["rave", "good", "mixed", "pan"])), { favorablePercent: 50, count:4, source:"https://bookmarks.reviews/reviews/test-book/" });
  assert.equal(parseBookMarksWidget(html(["rave", "positive", "rave"])).favorablePercent,100);
  assert.equal(parseBookMarksWidget(html(["mixed", "pan", "mixed"])).favorablePercent,0);
});
test("Incomplete widgets, insufficient reviews and foreign source links never produce scores", () => {
  assert.equal(parseBookMarksWidget(html(["rave", "good", "mixed"],28)),null);
  assert.equal(parseBookMarksWidget(html(["rave", "good"])),null);
  assert.equal(parseBookMarksWidget(html(["rave", "good", "mixed"],3,"https://evil.example/reviews/test/")),null);
  assert.equal(parseBookMarksWidget("Service unavailable"),null);
});
