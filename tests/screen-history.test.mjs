import test from "node:test";
import assert from "node:assert/strict";
import { createScreenHistory, screenHistoryKey } from "../src/lib/screen-history.ts";
function memory() {
  let value = null;
  return {
    getItem: () => value,
    setItem: (_, next) => {
      value = next;
    },
  };
}
test("back to a library history entry restores To read, filters, sorting and expanded pagination", () => {
  const storage = memory();
  const state = createScreenHistory(storage);
  const library = screenHistoryKey("anna", "/library", "entry-1");
  state.set(library, "library.tab", "to_read");
  state.set(library, "library.genre", "fiction");
  state.set(library, "library.order", "title");
  state.set(library, "library.visible", 80);
  const book = screenHistoryKey("anna", "/book/ol:OL1W", "entry-2");
  assert.equal(state.get(book, "library.tab", "read"), "read");
  assert.equal(state.get(library, "library.tab", "read"), "to_read");
  assert.equal(state.get(library, "library.genre", "all"), "fiction");
  assert.equal(state.get(library, "library.order", "last-read"), "title");
  assert.equal(state.get(library, "library.visible", 40), 80);
  const reloaded = createScreenHistory(storage);
  assert.equal(reloaded.get(library, "library.tab", "read"), "to_read");
});
test("distinct visits to the same route and different accounts never overwrite one another", () => {
  const state = createScreenHistory(memory());
  const first = screenHistoryKey("anna", "/library", "first");
  const second = screenHistoryKey("anna", "/library", "second");
  state.set(first, "tab", "to_read");
  state.set(second, "tab", "read");
  assert.equal(state.get(first, "tab", "reading"), "to_read");
  assert.equal(state.get(second, "tab", "reading"), "read");
  assert.equal(
    state.get(screenHistoryKey("other", "/library", "first"), "tab", "reading"),
    "reading",
  );
});
test("challenge path and profile tab restore without caching editable forms or account records", () => {
  const state = createScreenHistory(memory());
  state.set("challenges", "active", "nobel");
  state.set("challenges", "limit", 80);
  state.set("profile", "tab", "authors");
  assert.equal(
    state.get("challenges", "active", null, (v) => v === null || v === "nobel"),
    "nobel",
  );
  assert.equal(state.get("challenges", "limit", 20), 80);
  assert.equal(state.get("profile", "tab", "read"), "authors");
  state.set("challenges", "active", null);
  assert.equal(
    state.get("challenges", "active", null, (v) => v === null || v === "nobel"),
    null,
  );
});
test("damaged or blocked storage, invalid values and duplicate writes remain safe", () => {
  const corrupt = createScreenHistory({
    getItem: () => "{bad",
    setItem: () => {
      throw Error("blocked");
    },
  });
  let notifications = 0;
  const unsubscribe = corrupt.subscribe(() => notifications++);
  assert.equal(corrupt.get("entry", "tab", "read"), "read");
  corrupt.set("entry", "tab", "to_read");
  corrupt.set("entry", "tab", "to_read");
  assert.equal(corrupt.get("entry", "tab", "read"), "to_read");
  assert.equal(notifications, 1);
  corrupt.set("entry", "visible", Infinity);
  assert.equal(corrupt.get("entry", "visible", 40), 40);
  corrupt.set("entry", "visible", "wrong type");
  assert.equal(corrupt.get("entry", "visible", 40), 40);
  unsubscribe();
  corrupt.set("entry", "tab", "read");
  assert.equal(notifications, 2);
});
test("history memory is bounded and keeps the most recently used entries", () => {
  const storage = memory();
  const state = createScreenHistory(storage);
  for (let i = 0; i < 100; i++) state.set(`entry-${i}`, "tab", "to_read");
  assert.equal(JSON.parse(storage.getItem()).length, 80);
  assert.equal(state.get("entry-0", "tab", "read"), "read");
  assert.equal(state.get("entry-99", "tab", "read"), "to_read");
});

test("the actual router history restores each original entry across Back and Forward", async () => {
  const { createMemoryHistory } = await import("@tanstack/history");
  const history = createMemoryHistory({ initialEntries: ["/library"] });
  const state = createScreenHistory(memory());
  const entry = () =>
    screenHistoryKey("anna", history.location.pathname, history.location.state.__TSR_key);
  const first = entry();
  state.set(first, "library.tab", "to_read");
  state.set(first, "library.q", "Portugal");
  history.push("/book/portugal");
  history.flush();
  assert.notEqual(entry(), first);
  history.back();
  history.flush();
  assert.equal(history.location.pathname, "/library");
  assert.equal(entry(), first);
  assert.equal(state.get(entry(), "library.tab", "read"), "to_read");
  assert.equal(state.get(entry(), "library.q", ""), "Portugal");
  history.forward();
  history.flush();
  assert.equal(history.location.pathname, "/book/portugal");
  history.push("/library");
  history.flush();
  const later = entry();
  assert.notEqual(later, first);
  state.set(later, "library.tab", "reading");
  history.back();
  history.flush();
  history.back();
  history.flush();
  assert.equal(entry(), first);
  assert.equal(state.get(entry(), "library.tab", "read"), "to_read");
});
