import test from "node:test";
import assert from "node:assert/strict";
import { findDailyFragmentBook, fragmentCatalogueTitle } from "../src/lib/daily-fragment-book.ts";
const fragment = {
  title: "Concerning the Jews (Harper's Magazine, Sept. 1899)",
  author: "Mark Twain",
};
const book = (title, author = "Mark Twain", cover = "cover") => ({
  id: title,
  title,
  authors: [author],
  cover_url: cover,
});
test("source citation suffix is removed without stripping sequel labels", () => {
  assert.equal(fragmentCatalogueTitle(fragment.title), "Concerning the Jews");
  assert.equal(fragmentCatalogueTitle("Story (Book Two)"), "Story (Book Two)");
});
test("a verified original-language cover survives an empty translated catalogue", async () => {
  const calls = [];
  const result = await findDailyFragmentBook(fragment, fragment.title, "it", async (q, opts) => {
    calls.push(opts.language);
    assert.ok(!q.includes("1899"));
    return opts.language ? [] : [book("Concerning the Jews")];
  });
  assert.equal(result.title, "Concerning the Jews");
  assert.deepEqual(calls, ["it", undefined]);
});
test("matching covers stop fallback requests; unrelated authors and sequels never match", async () => {
  let calls = 0;
  const result = await findDailyFragmentBook(fragment, fragment.title, "en", async () => {
    calls++;
    return [
      book("Concerning the Jews", "Other Writer"),
      book("Concerning the Jews II"),
      book("Concerning the Jews"),
    ];
  });
  assert.equal(calls, 1);
  assert.equal(result.title, "Concerning the Jews");
});
test("outages and missing covers retain a verified book without borrowing another work", async () => {
  let calls = 0;
  const result = await findDailyFragmentBook(fragment, fragment.title, "it", async () => {
    if (calls++) throw Error("offline");
    return [book("Concerning the Jews", "Mark Twain", null)];
  });
  assert.equal(result.cover_url, null);
  assert.equal(
    await findDailyFragmentBook(
      { title: "In bicicletta", author: "Alfredo Oriani" },
      "In bicicletta",
      "it",
      async () => [book("Viaggio in bicicletta", "Alfredo Oriani")],
    ),
    null,
  );
});
