import test from "node:test";
import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import {
  createLibraryCache,
  librarySnapshot,
  restoreLibrarySnapshot,
} from "../src/lib/library-cache.ts";
const now = Date.now();
const book = {
  id: "owned",
  title: "Owned book",
  authors: ["Author"],
  categories: [],
  cover_url: null,
  description: null,
  page_count: 200,
  published_year: 2025,
};
const item = {
  id: "item",
  user_id: "anna",
  book_id: "owned",
  status: "reading",
  current_page: 10,
  total_pages: 200,
  favorite: false,
  created_at: new Date(now).toISOString(),
  updated_at: new Date(now).toISOString(),
  books: book,
};
const client = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
function seed(qc) {
  qc.setQueryData(["library", "anna"], [item], { updatedAt: now - 60000 });
  qc.setQueryData(
    ["book", "owned", "it"],
    { ...book, description: "Descrizione" },
    { updatedAt: now - 30000 },
  );
  qc.setQueryData(["book", "owned", "en"], { ...book, description: "Description" });
  qc.setQueryData(["book", "unowned", "it"], { ...book, id: "unowned" });
  qc.setQueryData(["fragments", "anna"], [{ quote: "Private text" }]);
  qc.setQueryData(["library", "other"], [{ ...item, user_id: "other" }]);
}
test("cache includes only the current library and owned metadata, retaining language and original freshness", () => {
  const qc = client();
  seed(qc);
  const snapshot = librarySnapshot(qc, "anna", now);
  const restored = client();
  restoreLibrarySnapshot(restored, "anna", snapshot, now);
  assert.equal(restored.getQueryData(["library", "anna"])[0].book_id, "owned");
  assert.equal(restored.getQueryData(["book", "owned", "it"]).description, "Descrizione");
  assert.equal(restored.getQueryData(["book", "owned", "en"]).description, "Description");
  assert.equal(restored.getQueryState(["library", "anna"]).dataUpdatedAt, now - 60000);
  assert.equal(restored.getQueryData(["book", "unowned", "it"]), undefined);
  assert.equal(restored.getQueryData(["library", "other"]), undefined);
  assert.equal(restored.getQueryData(["fragments", "anna"]), undefined);
});
test("wrong owners, expired snapshots and malformed rows are never restored; newer data wins", () => {
  const qc = client();
  seed(qc);
  const snapshot = librarySnapshot(qc, "anna", now);
  for (const invalid of [
    { ...snapshot, owner: "other" },
    { ...snapshot, savedAt: now - 8 * 86400000 },
    { ...snapshot, version: 0 },
    {
      ...snapshot,
      entries: [
        { key: ["library", "anna"], data: [{ ...item, user_id: "other" }], updatedAt: now },
      ],
    },
  ]) {
    const target = client();
    assert.equal(restoreLibrarySnapshot(target, "anna", invalid, now), false);
    assert.equal(target.getQueryCache().getAll().length, 0);
  }
  const target = client();
  target.setQueryData(["book", "owned", "it"], { ...book, description: "New" }, { updatedAt: now });
  restoreLibrarySnapshot(target, "anna", snapshot, now);
  assert.equal(target.getQueryData(["book", "owned", "it"]).description, "New");
});
test("invalidated library snapshots cannot resurrect removed books", async () => {
  const qc = client();
  seed(qc);
  await qc.invalidateQueries({ queryKey: ["library", "anna"] });
  assert.equal(librarySnapshot(qc, "anna", now), null);
  qc.setQueryData(["library", "anna"], []);
  const target = client();
  restoreLibrarySnapshot(target, "anna", librarySnapshot(qc, "anna", now), now);
  assert.deepEqual(target.getQueryData(["library", "anna"]), []);
  assert.equal(target.getQueryData(["book", "owned", "it"]), undefined);
});
test("logout clears persisted data and an old restore cannot hydrate a new account", async () => {
  const source = client();
  seed(source);
  let stored = librarySnapshot(source, "anna", now);
  let release;
  const read = new Promise((resolve) => {
    release = resolve;
  });
  const store = {
    read: () => read,
    write: async (value) => {
      stored = value;
    },
    clear: async () => {
      stored = null;
    },
  };
  const target = client();
  const cache = createLibraryCache(target, store);
  const first = cache.activate("anna");
  const logout = cache.activate(null);
  release(stored);
  await Promise.all([first, logout]);
  assert.equal(target.getQueryData(["library", "anna"]), undefined);
  assert.equal(stored, null);
  cache.dispose();
});
test("disabled storage never prevents activation or normal query updates", async () => {
  const store = {
    read: async () => {
      throw Error("denied");
    },
    write: async () => {
      throw Error("quota");
    },
    clear: async () => {
      throw Error("denied");
    },
  };
  const qc = client();
  const cache = createLibraryCache(qc, store);
  await cache.activate("anna");
  seed(qc);
  await cache.flush();
  assert.equal(qc.getQueryData(["library", "anna"]).length, 1);
  await cache.activate(null);
  cache.dispose();
});

test("owned manga covers persist without mixing another series and expired details do not discard a fresh library", () => {
  const qc = client();
  seed(qc);
  qc.setQueryData(
    ["library", "anna"],
    [
      item,
      { ...item, id: "manga-item", book_id: "manga:mal:3", books: { ...book, id: "manga:mal:3" } },
    ],
  );
  qc.setQueryData(
    ["manga-volume-covers-v2", null, 3, "20th Century Boys", "it"],
    [{ volume: 1, url: "https://example.com/1.jpg", language: "it" }],
  );
  qc.setQueryData(
    ["manga-volume-covers-v2", null, 2, "Berserk", "it"],
    [{ volume: 1, url: "https://example.com/other.jpg", language: "it" }],
  );
  const snapshot = librarySnapshot(qc, "anna", now);
  snapshot.entries.find((e) => e.key[0] === "book").updatedAt = now - 8 * 86400000;
  const target = client();
  assert.equal(restoreLibrarySnapshot(target, "anna", snapshot, now), true);
  assert.equal(
    target.getQueryData(["manga-volume-covers-v2", null, 3, "20th Century Boys", "it"]).length,
    1,
  );
  assert.equal(
    target.getQueryData(["manga-volume-covers-v2", null, 2, "Berserk", "it"]),
    undefined,
  );
});

test("mutation invalidation clears disk before refetch and successful empty results replace it", async () => {
  const qc = client();
  seed(qc);
  let stored = null;
  const store = {
    read: async () => null,
    write: async (value) => {
      stored = value;
    },
    clear: async () => {
      stored = null;
    },
  };
  const cache = createLibraryCache(qc, store);
  await cache.activate("anna");
  assert.ok(stored);
  await qc.invalidateQueries({ queryKey: ["library", "anna"] });
  await cache.flush();
  assert.equal(stored, null);
  qc.setQueryData(["library", "anna"], []);
  await cache.flush();
  assert.deepEqual(stored.entries.find((e) => e.key[0] === "library").data, []);
  cache.dispose();
});
