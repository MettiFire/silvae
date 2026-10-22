import test from "node:test";
import assert from "node:assert/strict";
import { createReaderHandler } from "../supabase/functions/reader-sync/handler.ts";
const headers = {
  "x-auth-user": "11111111-1111-4111-8111-111111111111",
  "x-auth-key": "a".repeat(32),
  "Content-Type": "application/json",
};
const request = (path, method = "GET", body) =>
  new Request("https://example.test/functions/v1/reader-sync" + path, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
test("KOReader protocol login, push, pull and strict input limits", async () => {
  const calls = [];
  const handler = createReaderHandler(
    async (name, args) => {
      calls.push({ name, args });
      return name === "reader_kosync" && args.p_document ? null : { authorized: true };
    },
    () => new Date("2026-10-22T10:00:00Z"),
  );
  assert.equal((await handler(request("/users/auth"))).status, 200);
  const body = {
    document: "hash",
    progress: "/body/p",
    percentage: 0.425,
    device: "Kindle",
    device_id: "id",
  };
  assert.equal((await handler(request("/syncs/progress", "PUT", body))).status, 200);
  assert.equal(calls.at(-1).args.p_documents[0].percentage, 42.5);
  assert.equal(calls.at(-1).args.p_documents[0].finished, false);
  assert.equal(calls.at(-1).args.p_documents[0].observed_at, "2026-10-22T10:00:00.000Z");
  assert.equal((await handler(request("/syncs/progress/hash"))).status, 200);
  assert.equal(
    (await handler(request("/syncs/progress", "PUT", { ...body, percentage: 42 }))).status,
    400,
  );
  assert.equal(
    (await handler(request("/syncs/progress", "PUT", { ...body, progress: "a".repeat(20000) })))
      .status,
    413,
  );
  assert.equal((await handler(request("/users/create", "POST", {}))).status, 403);
  assert.equal(
    (await handler(new Request("https://example.test/reader-sync/users/auth"))).status,
    401,
  );
  const bad = createReaderHandler(async () => {
    throw Error("Invalid token");
  });
  assert.equal((await bad(request("/users/auth"))).status, 401);
});
