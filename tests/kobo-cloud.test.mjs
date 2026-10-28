import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { authorizeKoboJob, handleKoboJob } from "../src/lib/kobo-job.server.ts";
import { openReaderState } from "../src/lib/reader-cloud-crypto.server.ts";
import {
  parseKoboActivation,
  pollKobo,
  readKoboLibrary,
  publicKobo,
  sealKobo,
  openKobo,
  koboUpdates,
} from "../src/lib/kobo-cloud.server.ts";

const id = "11111111-1111-1111-1111-111111111111";
const pending = {
  phase: "pending",
  device: "private-device",
  code: "123456",
  pollPath: "/it/it/activateonweb/poll?workflowId=private-workflow",
  expiresAt: Date.now() + 600000,
  nextPollAt: 0,
};
const connected = {
  phase: "connected",
  device: "private-device",
  accessToken: "private-access",
  refreshToken: "private-refresh",
  books: {},
  mappings: {},
  connectedAt: Date.now(),
};
test("activation accepts only bounded Kobo workflow paths and keeps private workflow details off the browser", () => {
  assert.equal(
    parseKoboActivation(
      '<div data-poll-endpoint="/it/it/activateonweb/poll?workflowId=abc"></div><a href="https://kobo.com/activate?code=123456">Activate</a>',
      "device",
    ).code,
    "123456",
  );
  for (const path of [
    "https://evil.test/poll?workflowId=abc",
    "//evil.test/it/it/activateonweb/poll?workflowId=abc",
    "/it/it/activateonweb/poll?workflowId=abc&amp;url=https://evil.test",
  ])
    assert.throws(() =>
      parseKoboActivation(
        `<div data-poll-endpoint="${path}"></div><a href="?code=123456">go</a>`,
        "device",
      ),
    );
  assert.ok(!JSON.stringify(publicKobo(pending)).includes("private"));
  assert.ok(!JSON.stringify(publicKobo(connected)).includes("private"));
});
test("pairing credentials remain server-only and device auth uses the same device identity", async () => {
  const calls = [];
  const result = await pollKobo(pending, async (url, init) => {
    calls.push(String(url));
    assert.equal(init.redirect, "manual");
    if (calls.length === 1)
      return Response.json({
        Status: "Complete",
        RedirectUrl: "kobo://UserAuthenticated?userKey=private-user",
      });
    assert.equal(JSON.parse(init.body).DeviceId, pending.device);
    assert.equal(JSON.parse(init.body).UserKey, "private-user");
    return Response.json({
      AccessToken: "new-private-access",
      RefreshToken: "new-private-refresh",
      TokenType: "Bearer",
    });
  });
  assert.equal(result.phase, "connected");
  assert.equal(calls.length, 2);
  assert.ok(!JSON.stringify(publicKobo(result)).includes("private"));
});
test("ciphertext is bound to the owner and never stores plaintext credentials", () => {
  const secret = "a".repeat(64),
    sealed = sealKobo(connected, id, secret);
  assert.ok(!sealed.includes("private"));
  assert.deepEqual(openKobo(sealed, id, secret), connected);
  assert.throws(() => openKobo(sealed, "other-owner", secret));
  assert.throws(() => openReaderState(sealed, id, secret, "kindle"));
});
test("scheduled requests bind owner, provider, action and time before any network access", async () => {
  const secret = "a".repeat(64),
    now = Date.now(),
    input = JSON.stringify({ provider: "kobo", action: "run", owner: id, time: now });
  const signed = createHmac("sha256", Buffer.from(secret, "hex")).update(input).digest("hex");
  assert.equal(authorizeKoboJob(input, signed, secret, now).owner, id);
  for (const text of [
    input.replace("kobo", "kindle"),
    input.replace(id, "22222222-2222-2222-2222-222222222222"),
    input + " ",
  ])
    assert.equal(authorizeKoboJob(text, signed, secret, now), null);
  assert.equal(authorizeKoboJob(input, signed, secret, now + 61000), null);
  let calls = 0;
  const response = await handleKoboJob(
    new Request("https://silvae.example/api/kobo-job", { method: "POST", body: input }),
    { KINDLE_JOB_KEY: secret, KINDLE_CLOUD_KEY: secret },
    async () => {
      calls++;
      throw Error();
    },
  );
  assert.equal(response.status, 401);
  assert.equal(calls, 0);
});
test("malformed progress and removed entitlements cannot generate updates; failed refresh fetches retain credentials without committing partial data", async () => {
  const original = { ...connected, books: {}, mappings: {} };
  let calls = 0;
  await assert.rejects(
    readKoboLibrary(original, async (url) => {
      if (String(url).endsWith("/auth/refresh"))
        return Response.json({ AccessToken: "rotated-access", RefreshToken: "rotated-refresh" });
      calls++;
      return calls === 1
        ? new Response("", { status: 401 })
        : new Response("unavailable", { status: 503 });
    }),
  );
  assert.equal(original.refreshToken, "rotated-refresh");
  assert.deepEqual(original.books, {});
  assert.equal(original.syncToken, undefined);
  for (const percent of [-1, 101, "50", null]) {
    const state = await readKoboLibrary({ ...connected, books: {} }, async () =>
      Response.json([entity(percent)]),
    );
    assert.equal(state.books[id].percentage, undefined);
  }
  const removed = await readKoboLibrary(
    {
      ...connected,
      books: { [id]: { id, title: "Example", authors: ["Author"], percentage: 50 } },
    },
    async () =>
      Response.json([{ ChangedEntitlement: { BookEntitlement: { Id: id, IsRemoved: true } } }]),
  );
  assert.equal(removed.books[id], undefined);
  await assert.rejects(
    readKoboLibrary({ ...connected, books: {} }, async () =>
      Response.json([entity()], { headers: { "x-kobo-sync": "continue" } }),
    ),
  );
});
const entity = (percent = 25) => ({
  NewEntitlement: {
    BookEntitlement: { Id: id, Accessibility: "Full", IsRemoved: false },
    BookMetadata: { Title: "Example", Contributors: ["Author"] },
    ReadingState: {
      EntitlementId: id,
      LastModified: "2026-01-02T00:00:00Z",
      CurrentBookmark: { ProgressPercent: percent, LastModified: "2026-01-02T00:00:00Z" },
      StatusInfo: { Status: "Reading" },
    },
  },
});
test("catalogue follows bounded incremental pages, handles changed reading states and refreshes once", async () => {
  let page = 0,
    refresh = 0;
  const state = await readKoboLibrary(connected, async (url, init) => {
    if (String(url).endsWith("/auth/refresh")) {
      refresh++;
      return Response.json({ AccessToken: "refreshed", RefreshToken: "rotated" });
    }
    page++;
    if (page === 1) return new Response("", { status: 401 });
    assert.equal(init.headers.Authorization, "Bearer refreshed");
    if (page === 2)
      return Response.json([entity()], {
        headers: { "x-kobo-sync": "continue", "x-kobo-synctoken": "next" },
      });
    assert.equal(init.headers["x-kobo-synctoken"], "next");
    return Response.json(
      [
        {
          ChangedReadingState: {
            ReadingState: {
              EntitlementId: id,
              LastModified: "2026-01-03T00:00:00Z",
              CurrentBookmark: { ProgressPercent: 40, LastModified: "2026-01-03T00:00:00Z" },
              StatusInfo: { Status: "Reading" },
            },
          },
        },
      ],
      { headers: { "x-kobo-synctoken": "done" } },
    );
  });
  assert.equal(refresh, 1);
  assert.equal(state.books[id].percentage, 40);
  assert.equal(state.syncToken, "done");
  assert.equal(state.books[id].title, "Example");
  assert.equal(state.partial, false);
});
test("newer manual progress, ambiguous matches, stale sessions and finished books are preserved", () => {
  const book = {
    id,
    title: "Example",
    authors: ["Author"],
    percentage: 25,
    observed: "2026-01-02T00:00:00Z",
    status: "Reading",
  };
  const item = {
    id: "library",
    book_id: "book",
    books: { title: "Example", authors: ["Author"] },
    status: "to_read",
    started_at: null,
    updated_at: "2026-01-01T00:00:00Z",
    progress_updated_at: null,
    reading_session_id: "session",
  };
  const state = { ...connected, books: { [id]: book } };
  assert.equal(koboUpdates(state, [item]).updates[0].percentage, 25);
  assert.equal(
    koboUpdates({ ...state, books: { [id]: { ...book, status: "Finished", percentage: 95 } } }, [
      item,
    ]).updates[0].status,
    "read",
  );
  assert.equal(
    koboUpdates({ ...state, books: { [id]: { ...book, status: "Finished", percentage: 30 } } }, [
      item,
    ]).updates[0].status,
    "abandoned",
  );
  assert.equal(
    koboUpdates({ ...state, books: { [id]: { ...book, observed: "invalid" } } }, [item]).updates
      .length,
    0,
  );
  const newer = {
    ...book,
    id: "22222222-2222-2222-2222-222222222222",
    observed: "2026-01-03T00:00:00Z",
    percentage: 50,
  };
  const duplicate = koboUpdates({ ...state, books: { [id]: book, [newer.id]: newer } }, [
    item,
  ]).updates;
  assert.equal(duplicate.length, 1);
  assert.equal(duplicate[0].percentage, 50);
  for (const status of ["read", "abandoned"])
    assert.equal(koboUpdates(state, [{ ...item, status }]).updates.length, 0);
  assert.equal(
    koboUpdates(state, [{ ...item, progress_updated_at: "2026-01-03T00:00:00Z" }]).updates.length,
    0,
  );
  assert.equal(koboUpdates(state, [item, { ...item, id: "other" }]).updates.length, 0);
  assert.equal(
    koboUpdates({ ...state, mappings: { [id]: { libraryId: item.id, sessionId: "previous" } } }, [
      item,
    ]).updates.length,
    0,
  );
  for (const percentage of [NaN, -1, 101, 0])
    assert.equal(
      koboUpdates({ ...state, books: { [id]: { ...book, percentage } } }, [item]).updates.length,
      0,
    );
});
test("a status-only finish uses its own timestamp without re-dating or replacing older bookmark progress", async () => {
  const state = await readKoboLibrary({ ...connected, books: {} }, async () =>
    Response.json([
      {
        NewEntitlement: {
          ...entity(95).NewEntitlement,
          ReadingState: {
            EntitlementId: id,
            LastModified: "2026-01-03T00:00:00Z",
            CurrentBookmark: { ProgressPercent: 95, LastModified: "2026-01-02T00:00:00Z" },
            StatusInfo: { Status: "Finished", LastModified: "2026-01-03T00:00:00Z" },
          },
        },
      },
    ]),
  );
  const local = {
    id: "library",
    book_id: "book",
    books: { title: "Example", authors: ["Author"] },
    status: "reading",
    started_at: null,
    updated_at: "2026-01-02T00:00:00Z",
    progress_updated_at: "2026-01-02T12:00:00Z",
    reading_session_id: "session",
  };
  const update = koboUpdates(state, [local]).updates[0];
  assert.equal(update?.status, "read");
  assert.equal(update?.observed, "2026-01-03T00:00:00Z");
  assert.equal(update?.percentage, undefined);
  assert.equal(state.books[id].observed, "2026-01-02T00:00:00Z");
});
