import test from "node:test";
import assert from "node:assert/strict";
import { saveFragmentPhoto } from "../src/lib/fragment-photos.ts";

const user = "11111111-1111-4111-8111-111111111111";
const draft = { kind: "quote", quote: "", note: "", position: "", tags: [], favorite: false };
function fixture({ insertError = null, uploadError = null, actualUser = user } = {}) {
  const events = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: actualUser } }, error: null }) },
    storage: {
      from: (name) => {
        assert.equal(name, "fragment-photos");
        return {
          upload: async (path, photo, options) => {
            events.push(["upload", path, options]);
            return { error: uploadError };
          },
          remove: async (paths) => {
            events.push(["remove", paths]);
            return { error: null };
          },
        };
      },
    },
    from: (name) => {
      assert.equal(name, "fragments");
      return {
        insert: async (value) => {
          events.push(["insert", value]);
          return { error: insertError };
        },
      };
    },
  };
  return { client, events };
}
const photo = () => new Blob(["pixels"], { type: "image/webp" });

test("photo-only save uploads an immutable owner path and retains an optional caption", async () => {
  const { client, events } = fixture();
  await saveFragmentPhoto(client, user, "book", draft, photo());
  assert.deepEqual(
    events.map((e) => e[0]),
    ["upload", "insert"],
  );
  assert.match(events[0][1], new RegExp(`^${user}/[a-f0-9-]{36}\\.webp$`));
  assert.equal(events[0][2].upsert, false);
  assert.equal(events[1][1].image_path, events[0][1]);
  assert.equal(events[1][1].quote, "");
});
test("failed fragment save cleans up the upload and preserves the failure", async () => {
  const { client, events } = fixture({ insertError: new Error("database offline") });
  await assert.rejects(saveFragmentPhoto(client, user, "book", draft, photo()), /database offline/);
  assert.deepEqual(
    events.map((e) => e[0]),
    ["upload", "insert", "remove"],
  );
  assert.deepEqual(events[2][1], [events[0][1]]);
});
test("upload failures, wrong sessions and unsupported photo blobs cannot create fragments", async () => {
  for (const options of [{ uploadError: new Error("offline") }, { actualUser: "other" }]) {
    const { client, events } = fixture(options);
    await assert.rejects(saveFragmentPhoto(client, user, "book", draft, photo()));
    assert.equal(
      events.some((e) => e[0] === "insert"),
      false,
    );
  }
  const { client, events } = fixture();
  await assert.rejects(
    saveFragmentPhoto(client, user, "book", draft, new Blob(["html"], { type: "text/html" })),
  );
  assert.equal(events.length, 0);
});
