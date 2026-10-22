import test from "node:test";
import assert from "node:assert/strict";
import { profileShelves, validateProfile } from "../src/lib/profile-model.ts";
test("public shelves separate read, wishlist, favorites and reading; newest completion includes rereads", () => {
  const item = (id, status, finished_at, favorite = false, last_reread_at = null) => ({
    id,
    status,
    finished_at,
    favorite,
    last_reread_at,
    created_at: "2026-01-01",
    books: null,
  });
  const shelves = profileShelves([
    item("older", "read", "2025-01-01", true, "2026-10-21"),
    item("newer", "read", "2026-10-01"),
    item("waiting", "to_read", null),
    item("reading", "reading", null),
    item("no-date", "read", null),
  ]);
  assert.deepEqual(
    shelves.read.map((i) => i.id),
    ["older", "newer", "no-date"],
  );
  assert.equal(shelves.wishlist[0].id, "waiting");
  assert.equal(shelves.favorites.length, 1);
  assert.equal(shelves.reading.length, 1);
});
test("profile edits normalize public identity and reject invalid usernames, URLs and excessive bio", () => {
  const valid = {
    username: " Reader_One ",
    display_name: " Reader ",
    bio: " Bio ",
    avatar_url: "https://example.test/image.jpg",
    banner_url: "",
  };
  assert.equal(validateProfile(valid).username, "reader_one");
  assert.equal(validateProfile(valid).display_name, "Reader");
  for (const patch of [
    { username: "has spaces" },
    { username: "ab" },
    { avatar_url: "javascript:alert(1)" },
    { banner_url: "http://example.test/x" },
    { bio: "x".repeat(1001) },
  ])
    assert.throws(() => validateProfile({ ...valid, ...patch }));
});
