import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("reader connections: credentials, ownership, mapping and offline sync", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  const one = "11111111-1111-4111-8111-111111111111",
    two = "22222222-2222-4222-8222-222222222222",
    secret = "a".repeat(64);
  await db.exec(
    `CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;GRANT USAGE ON SCHEMA auth TO anon,authenticated;INSERT INTO auth.users(id,email) VALUES('${one}','one@example.test'),('${two}','two@example.test');`,
  );
  for (const name of [
    "20260901203401_c217526c-ddb4-42b5-98c0-99f528210932.sql",
    "20261022010000_fragments_and_reading_progress.sql",
    "20261022020000_reader_connections.sql",
  ])
    await db.exec(
      await readFile(new URL("../supabase/migrations/" + name, import.meta.url), "utf8"),
    );
  await db.exec(
    `INSERT INTO books(id,title,authors) VALUES('book','Example',ARRAY['Writer']);INSERT INTO library_items(user_id,book_id,status,total_pages) VALUES('${one}','book','reading',200);`,
  );
  const as = async (id) =>
    db.exec(
      `RESET ROLE;SET ROLE ${id ? "authenticated" : "anon"};SELECT set_config('request.jwt.claim.sub','${id || ""}',false)`,
    );
  const scalar = async (sql, args = []) => (await db.query(sql, args)).rows[0].value;
  await as(one);
  const cid = await scalar(`SELECT create_reader_connection('Kobo','kobo',$1) AS value`, [secret]);
  let doc;
  const batch = (percent = 24, time = "2026-01-01T10:00:00Z", event = "evt1") => [
    {
      external_id: "file:///test.epub",
      title: "Example",
      authors: ["Writer"],
      percentage: percent,
      observed_at: time,
      event_id: event,
      fragments: [{ id: "quote1", quote: "Private words" }],
    },
  ];
  const ingest = async (data = batch(), credential = secret) =>
    scalar("SELECT ingest_reader_batch($1,$2,$3::jsonb) AS value", [
      cid,
      credential,
      JSON.stringify(data),
    ]);
  await t.test(
    "device token is write-only and unmapped books require owner selection",
    async () => {
      await assert.rejects(db.query("SELECT * FROM reader_credentials"));
      await as(null);
      await assert.rejects(ingest(batch(), "wrong"));
      assert.equal((await ingest()).results[0].result, "unmapped");
      await assert.rejects(db.query("SELECT * FROM reader_documents"));
      await assert.rejects(db.query("SELECT * FROM fragments"));
      await assert.rejects(db.query("SELECT apply_reader_document($1)", [cid]));
      await as(two);
      assert.equal((await db.query("SELECT * FROM reader_connections")).rows.length, 0);
      await assert.rejects(db.query("SELECT revoke_reader_connection($1)", [cid]));
      await as(one);
      doc = await scalar("SELECT id AS value FROM reader_documents");
      assert.equal(
        await scalar("SELECT bind_reader_document($1,$2) AS value", [doc, "book"]),
        "applied",
      );
      assert.equal(await scalar("SELECT progress_percent AS value FROM library_items"), "24");
      assert.equal(await scalar("SELECT current_page AS value FROM library_items"), 0);
      assert.equal(await scalar("SELECT count(*)::int AS value FROM fragments"), 1);
    },
  );
  await t.test(
    "duplicates preserve edited fragments and older offline events never replace newer progress",
    async () => {
      await db.query("UPDATE fragments SET quote='User edit'");
      await as(null);
      await ingest();
      await ingest(batch(10, "2025-01-01T10:00:00Z", "older"));
      await as(one);
      assert.equal(await scalar("SELECT progress_percent AS value FROM library_items"), "24");
      assert.equal(await scalar("SELECT quote AS value FROM fragments"), "User edit");
      await db.query("UPDATE library_items SET current_page=100");
      await as(null);
      assert.equal(
        (await ingest(batch(40, "2026-01-02T10:00:00Z", "old-manual"))).results[0].result,
        "stale",
      );
      await as(one);
      assert.equal(
        await scalar("SELECT progress_percent AS value FROM library_items"),
        "50.0000000000000000",
      );
    },
  );
  await t.test(
    "invalid progress rolls back; a new reading session requires explicit rebind",
    async () => {
      await as(null);
      await assert.rejects(ingest(batch(101)));
      await assert.rejects(ingest(batch(10, "2999-01-01T00:00:00Z")));
      await as(one);
      await db.query("SELECT start_reading_session('book')");
      await as(null);
      assert.equal(
        (await ingest(batch(45, "2026-01-03T10:00:00Z", "new-session"))).results[0].result,
        "old_session",
      );
      await as(one);
      assert.equal(await scalar("SELECT progress_percent AS value FROM library_items"), "0");
      await db.query("SELECT revoke_reader_connection($1)", [cid]);
      await as(null);
      await assert.rejects(ingest());
    },
  );
  await t.test("reconnecting does not duplicate fragments or restore trashed quotes", async () => {
    await as(one);
    await db.query("UPDATE fragments SET deleted_at=now()");
    const next = await scalar(
      "SELECT create_reader_connection('Kobo reconnected','kobo',$1) AS value",
      [secret],
    );
    await as(null);
    await scalar("SELECT ingest_reader_batch($1,$2,$3) AS value", [
      next,
      secret,
      JSON.stringify(batch()),
    ]);
    await as(one);
    const document = await scalar(
      "SELECT id AS value FROM reader_documents WHERE connection_id=$1",
      [next],
    );
    await scalar("SELECT bind_reader_document($1,'book') AS value", [document]);
    assert.equal(await scalar("SELECT count(*)::int AS value FROM fragments"), 1);
    assert.equal(
      await scalar("SELECT count(*)::int AS value FROM fragments WHERE deleted_at IS NOT NULL"),
      1,
    );
  });
  await t.test(
    "Kindle cannot report invented progress; KOReader accepts hashed password and returns document position",
    async () => {
      await as(one);
      const kindle = await scalar(
        "SELECT create_reader_connection('Kindle 11','kindle',$1) AS value",
        [secret],
      );
      const kosync = await scalar(
        "SELECT create_reader_connection('KOReader','koreader',$1) AS value",
        [secret],
      );
      await as(null);
      await assert.rejects(
        scalar("SELECT ingest_reader_batch($1,$2,$3) AS value", [
          kindle,
          secret,
          JSON.stringify(batch()),
        ]),
      );
      const key = await scalar("SELECT md5($1) AS value", [secret]);
      assert.equal(
        (await scalar("SELECT reader_kosync($1,$2) AS value", [kosync, key])).authorized,
        true,
      );
      await assert.rejects(scalar("SELECT reader_kosync($1,$2) AS value", [kosync, secret]));
      await scalar("SELECT ingest_reader_batch($1,$2,$3) AS value", [
        kosync,
        key,
        JSON.stringify([
          {
            external_id: "hash",
            percentage: 30,
            observed_at: "2026-01-01T00:00:00Z",
            event_id: "sync1",
            locator: "/body/p[2]",
            device: "KOReader",
            device_id: "id",
          },
        ]),
      ]);
      const state = await scalar("SELECT reader_kosync($1,$2,$3) AS value", [kosync, key, "hash"]);
      assert.equal(state.percentage, 0.3);
      assert.equal(state.progress, "/body/p[2]");
      await as(one);
      const kd = await scalar("SELECT id AS value FROM reader_documents WHERE connection_id=$1", [
        kosync,
      ]);
      await scalar("SELECT bind_reader_document($1,'book') AS value", [kd]);
      await db.query(
        "UPDATE library_items SET current_page=5, progress_percent=2.5, progress_source='manual', progress_updated_at=now()-interval '2 seconds' WHERE book_id='book'",
      );
      const observed = await scalar("SELECT now()::text AS value");
      await as(null);
      const response = await scalar("SELECT ingest_reader_batch($1,$2,$3) AS value", [
        kosync,
        key,
        JSON.stringify([
          {
            external_id: "hash",
            percentage: 40,
            observed_at: observed,
            event_id: "after-manual",
            locator: "/body/p[4]",
          },
        ]),
      ]);
      assert.equal(response.results[0].result, "manual_conflict");
      await as(one);
      assert.equal(
        Number(await scalar("SELECT progress_percent AS value FROM library_items")),
        2.5,
      );
      assert.equal(
        await scalar("SELECT bind_reader_document($1,'book') AS value", [kd]),
        "applied",
      );
    },
  );
});
