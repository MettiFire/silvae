import test from "node:test";
import assert from "node:assert/strict";
import {
  isFriendsFragmentDay,
  loadFriendsDailyFragment,
} from "../src/lib/friends-daily-fragment.ts";

function fixture(overrides = {}) {
  const calls = [];
  const book = {
    id: "book",
    title: "A book",
    authors: ["Writer"],
    cover_url: null,
    published_year: null,
    page_count: null,
    categories: [],
  };
  const data = {
    follows: [{ following_id: "friend" }],
    fragment_preferences: [{ user_id: "friend" }],
    fragments: [{ id: "quote", user_id: "friend", quote: "Shared words", books: book }],
    profiles: { username: "reader", display_name: "Reader" },
    ...overrides,
  };
  const client = {
    from(table) {
      const q = {
        then(resolve) {
          return Promise.resolve({ data: data[table], error: null }).then(resolve);
        },
      };
      for (const method of ["select", "eq", "in", "is", "order", "limit", "maybeSingle"])
        q[method] = (...args) => {
          calls.push([table, method, ...args]);
          return q;
        };
      return q;
    },
  };
  return { client, calls };
}
test("friends and catalogue alternate by day and refreshes keep the same choice", async () => {
  assert.notEqual(isFriendsFragmentDay("2026-10-27"), isFriendsFragmentDay("2026-10-28"));
  const { client, calls } = fixture();
  const result = await loadFriendsDailyFragment(client, "me", "2026-10-28");
  assert.equal(result.quote, "Shared words");
  assert.deepEqual(result.sharedBy, { username: "reader", name: "Reader" });
  assert.deepEqual(result, await loadFriendsDailyFragment(client, "me", "2026-10-28"));
  assert.ok(
    calls.some(
      (c) => c[0] === "follows" && c[1] === "eq" && c[2] === "follower_id" && c[3] === "me",
    ),
  );
  assert.ok(
    calls.some(
      (c) =>
        c[0] === "fragment_preferences" &&
        c[1] === "eq" &&
        c[2] === "visibility" &&
        c[3] === "public",
    ),
  );
  assert.ok(
    calls.some(
      (c) => c[0] === "fragments" && c[1] === "in" && c[2] === "user_id" && c[3][0] === "friend",
    ),
  );
  assert.ok(
    calls.some((c) => c[0] === "fragments" && c[1] === "eq" && c[2] === "kind" && c[3] === "quote"),
  );
  assert.ok(
    calls.some(
      (c) => c[0] === "fragments" && c[1] === "is" && c[2] === "deleted_at" && c[3] === null,
    ),
  );
  const fields = calls
    .filter((c) => c[0] === "fragments" && c[1] === "select")
    .map((c) => c[2])
    .join();
  assert.doesNotMatch(fields, /note|tags|position|source_ref/);
});
test("no follows or no public collection stops before fetching any quotations", async () => {
  for (const overrides of [{ follows: [] }, { fragment_preferences: [] }]) {
    const { client, calls } = fixture(overrides);
    assert.equal(await loadFriendsDailyFragment(client, "me", "2026-10-28"), null);
    assert.equal(
      calls.some((c) => c[0] === "fragments"),
      false,
    );
  }
});
test("missing book/profile and oversized or empty quotations keep the catalogue fallback", async () => {
  for (const overrides of [
    { profiles: null },
    { fragments: [{ id: "q", quote: "words", books: null }] },
    { fragments: [{ id: "q", quote: " ", books: { title: "Book" } }] },
    { fragments: [] },
  ]) {
    const { client } = fixture(overrides);
    assert.equal(await loadFriendsDailyFragment(client, "me", "2026-10-28"), null);
  }
});
