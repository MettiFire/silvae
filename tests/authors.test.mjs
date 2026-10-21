import test from "node:test";
import assert from "node:assert/strict";
import { defaultAuthor, getAuthorBooks, getAuthor } from "../src/lib/authors.ts";
import {
  parseFollowedAuthors,
  changeFollowedAuthor,
  AUTHORS_FIELD,
} from "../src/lib/followed-authors.ts";
import { saveReadingPreferences } from "../src/lib/reading-preferences-account.ts";
import { emptyPreferences, PREFERENCES_FIELD } from "../src/lib/reading-preferences.ts";
const author = { id: "OL26320A", name: "J. R. R. Tolkien", followedAt: "2026-10-21T12:00:00Z" };
function client(id = "reader", fail = false) {
  let data = {
    [AUTHORS_FIELD]: [],
    [PREFERENCES_FIELD]: emptyPreferences(),
    reading_challenges_v1: "keep",
  };
  return {
    get data() {
      return data;
    },
    auth: {
      getUser: async () => ({ data: { user: { id, user_metadata: data } }, error: null }),
      updateUser: async ({ data: patch }) => {
        if (fail) return { error: new Error("offline") };
        data = { ...data, ...patch };
        return { error: null };
      },
    },
  };
}
test("author identity resolves punctuation variants but never silently chooses between homonyms", () => {
  assert.equal(
    defaultAuthor([{ id: "OL26320A", name: "J.R.R. Tolkien" }], "J. R. R. Tolkien"),
    "OL26320A",
  );
  assert.equal(
    defaultAuthor(
      [
        { id: "OL1A", name: "Jane Smith" },
        { id: "OL2A", name: "Jane Smith" },
      ],
      "Jane Smith",
    ),
    null,
  );
  assert.equal(defaultAuthor([{ id: "OL1A", name: "John Smith" }], "Jane Smith"), null);
});
test("following persists by stable author id, avoids duplicates and preserves other metadata", async () => {
  const c = client();
  await changeFollowedAuthor(c, "reader", author, true);
  await changeFollowedAuthor(c, "reader", author, true);
  assert.equal(c.data[AUTHORS_FIELD].length, 1);
  assert.equal(c.data.reading_challenges_v1, "keep");
  assert.equal(c.data[PREFERENCES_FIELD].status, "skipped");
  await changeFollowedAuthor(c, "reader", author, false);
  assert.equal(c.data[AUTHORS_FIELD].length, 0);
  assert.equal(parseFollowedAuthors([{ ...author, id: "invalid" }, author, author]).length, 1);
});
test("account changes and failed writes cannot report saved authors or preferences", async () => {
  await assert.rejects(changeFollowedAuthor(client("other"), "reader", author, true));
  await assert.rejects(changeFollowedAuthor(client("reader", true), "reader", author, true));
  await assert.rejects(saveReadingPreferences(client("other"), "reader", emptyPreferences()));
  await assert.rejects(
    saveReadingPreferences(client("reader", true), "reader", emptyPreferences()),
  );
  const c = client();
  await changeFollowedAuthor(c, "reader", author, true);
  await saveReadingPreferences(c, "reader", {
    ...emptyPreferences(),
    status: "completed",
    liked: ["fantasy"],
  });
  assert.equal(c.data[AUTHORS_FIELD].length, 1);
  assert.deepEqual(c.data[PREFERENCES_FIELD].liked, ["fantasy"]);
});
test("bibliography uses stable author id, supported sort and pagination", async (t) => {
  const old = global.fetch;
  t.after(() => (global.fetch = old));
  global.fetch = async (url) => {
    const u = new URL(url);
    assert.equal(u.searchParams.get("q"), "author_key:OL26320A");
    assert.equal(u.searchParams.get("sort"), "new");
    assert.equal(u.searchParams.get("offset"), "24");
    return {
      ok: true,
      json: async () => ({
        numFound: 40,
        docs: [
          {
            key: "/works/OL1W",
            title: "Book",
            author_name: ["Tolkien"],
            first_publish_year: 2026,
            cover_i: 10,
          },
        ],
      }),
    };
  };
  const result = await getAuthorBooks("OL26320A", 1, "new");
  assert.equal(result.total, 40);
  assert.equal(result.books[0].id, "ol:OL1W");
  assert.equal(result.books[0].published_year, 2026);
  await assert.rejects(getAuthorBooks("../bad", 0, "new"));
});
test("author biography is rendered as plain text and invalid photo ids are ignored", async (t) => {
  const old = global.fetch;
  t.after(() => (global.fetch = old));
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      name: "Writer",
      bio: { value: "<p>Biography</p><script>bad()</script>" },
      photos: [-1],
    }),
  });
  const a = await getAuthor("OL1A");
  assert.equal(a.bio, "Biography");
  assert.equal(a.photo, null);
});
