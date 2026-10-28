import test from "node:test";
import assert from "node:assert/strict";
import { kindleStatusPatch, applyKindleStatus } from "../src/lib/kindle-library-sync.server.ts";
const item = {
  id: "library-id",
  status: "to_read",
  started_at: null,
  progress_updated_at: null,
  updated_at: "2025-01-01T00:00:00Z",
  reading_session_id: "session",
};
const reading = {
  status: "available",
  position: 1234,
  updatedAt: Date.parse("2026-01-01T00:00:00Z"),
};
test("Kindle status uses dated reading evidence without inventing completion or percentages", () => {
  const patch = kindleStatusPatch(item, reading);
  assert.equal(patch.status, "reading");
  assert.equal(patch.progress_percent, undefined);
  assert.equal(patch.current_page, undefined);
  assert.equal(patch.finished_at, undefined);
  const complete = kindleStatusPatch(item, {
    ...reading,
    percentage: 100,
    percentageSource: "positions",
  });
  assert.equal(complete.status, "read");
  assert.equal(complete.progress_percent, 100);
  assert.equal(complete.finished_at, new Date(reading.updatedAt).toISOString());
  for (const status of ["read", "abandoned"])
    assert.equal(kindleStatusPatch({ ...item, status }, reading), null);
  assert.equal(
    kindleStatusPatch({ ...item, progress_updated_at: "2026-02-01T00:00:00Z" }, reading),
    null,
  );
  assert.equal(kindleStatusPatch({ ...item, updated_at: "2026-02-01T00:00:00Z" }, reading), null);
  assert.equal(kindleStatusPatch(item, { ...reading, updatedAt: undefined }), null);
  assert.equal(kindleStatusPatch(item, { ...reading, position: 0 }), null);
});
test("status update is owner scoped and compares session and row version atomically", async () => {
  const filters = [];
  const chain = {
    update() {
      return chain;
    },
    eq(...args) {
      filters.push(args);
      return chain;
    },
    select() {
      return chain;
    },
    async maybeSingle() {
      return { data: null, error: null };
    },
  };
  const result = await applyKindleStatus({ from: () => chain }, "owner", item, reading);
  assert.match(result, /cambiata/);
  assert.deepEqual(filters, [
    ["user_id", "owner"],
    ["id", "library-id"],
    ["reading_session_id", "session"],
    ["updated_at", item.updated_at],
  ]);
});
test("a forward observation updates despite a frozen Amazon creation date, preserving manual edits", () => {
  const previous = {
    position: 100,
    updatedAt: reading.updatedAt,
    checkedAt: Date.parse("2026-02-02T00:00:00Z"),
    version: "native",
    status: "available",
  };
  const current = {
    ...reading,
    position: 200,
    checkedAt: Date.parse("2026-02-03T00:00:00Z"),
    contentVersion: { guid: "native" },
  };
  const local = { ...item, progress_updated_at: "2026-02-01T00:00:00Z" };
  assert.equal(
    kindleStatusPatch(local, current, previous)?.progress_updated_at,
    new Date(current.checkedAt).toISOString(),
  );
  assert.equal(kindleStatusPatch(local, { ...current, position: 100 }, previous), null);
  assert.equal(kindleStatusPatch(local, { ...current, position: 50 }, previous), null);
  assert.equal(kindleStatusPatch(local, current, { ...previous, version: "other" }), null);
  assert.equal(kindleStatusPatch(local, current, { ...previous, checkedAt: undefined }), null);
  assert.equal(
    kindleStatusPatch({ ...local, progress_updated_at: "2026-02-02T12:00:00Z" }, current, previous),
    null,
  );
  for (const status of ["read", "abandoned"])
    assert.equal(kindleStatusPatch({ ...local, status }, current, previous), null);
});
