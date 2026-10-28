import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("Kobo cloud database enforces ownership, leases, source/session CAS and disconnect cancellation", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  const owner = "11111111-1111-4111-8111-111111111111",
    other = "22222222-2222-4222-8222-222222222222";
  await db.exec(
    `CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;GRANT USAGE ON SCHEMA auth TO anon,authenticated;INSERT INTO auth.users(id,email) VALUES('${owner}','one@example.test'),('${other}','two@example.test');CREATE SCHEMA silvae_private;CREATE SCHEMA cron;CREATE FUNCTION cron.schedule(text,text,text) RETURNS bigint LANGUAGE sql AS $$SELECT 1::bigint$$;`,
  );
  for (const name of [
    "20260901203401_c217526c-ddb4-42b5-98c0-99f528210932.sql",
    "20261022010000_fragments_and_reading_progress.sql",
    "20261028160000_kobo_cloud.sql",
  ])
    await db.exec(
      await readFile(new URL("../supabase/migrations/" + name, import.meta.url), "utf8"),
    );
  await db.exec(
    `INSERT INTO books(id,title,authors) VALUES('book','Example',ARRAY['Author']);INSERT INTO library_items(user_id,book_id,status,updated_at) VALUES('${owner}','book','to_read','2025-01-01');`,
  );
  const as = async (id) =>
    db.exec(
      `RESET ROLE;SET ROLE ${id ? "authenticated" : "anon"};SELECT set_config('request.jwt.claim.sub','${id ?? ""}',false)`,
    );
  const scalar = async (sql, args = []) => (await db.query(sql, args)).rows[0].value;
  await as(owner);
  assert.equal(await scalar("SELECT kobo_cloud_read() AS value"), null);
  const claim = await scalar("SELECT kobo_cloud_claim(true) AS value");
  assert.ok(claim.lease);
  assert.equal(claim.library.length, 1);
  assert.equal(await scalar("SELECT kobo_cloud_claim(false) AS value"), null);
  await assert.rejects(db.query("SELECT * FROM kobo_cloud_connections"));
  await assert.rejects(db.query("SELECT silvae_private.claim_kobo($1,false)", [other]));
  await as(other);
  assert.equal(await scalar("SELECT kobo_cloud_read() AS value"), null);
  assert.equal(
    await scalar("SELECT kobo_cloud_finish($1,'encrypted') AS value", [claim.lease]),
    null,
  );
  await as(null);
  await assert.rejects(db.query("SELECT kobo_cloud_read()"));
  await as(owner);
  const item = claim.library[0],
    event = {
      id: item.id,
      session: item.reading_session_id,
      version: item.updated_at,
      observed: "2026-01-02T00:00:00Z",
      percentage: 25,
      status: "reading",
    };
  let result = await scalar("SELECT kobo_cloud_finish($1,'encrypted',$2::jsonb,false) AS value", [
    claim.lease,
    JSON.stringify([event]),
  ]);
  assert.equal(result.changed, 1);
  await db.exec("RESET ROLE");
  let row = (await db.query("SELECT * FROM library_items WHERE id=$1", [item.id])).rows[0];
  assert.equal(row.status, "reading");
  assert.equal(Number(row.progress_percent), 25);
  assert.equal(row.progress_source, "kobo");
  await as(owner);
  await db.query("SELECT kobo_cloud_automatic(true)");
  let next = await scalar("SELECT kobo_cloud_claim(false) AS value");
  await db.exec("RESET ROLE");
  await db.query(
    "UPDATE library_items SET progress_source='manual',progress_percent=75,progress_updated_at='2026-01-04',updated_at=now() WHERE id=$1",
    [item.id],
  );
  await as(owner);
  result = await scalar("SELECT kobo_cloud_finish($1,'encrypted',$2::jsonb,false) AS value", [
    next.lease,
    JSON.stringify([
      {
        ...event,
        version: next.library[0].updated_at,
        observed: "2026-01-03T00:00:00Z",
        percentage: 50,
      },
    ]),
  ]);
  assert.equal(result.changed, 0);
  next = await scalar("SELECT kobo_cloud_claim(false) AS value");
  result = await scalar("SELECT kobo_cloud_finish($1,'encrypted',$2::jsonb,false) AS value", [
    next.lease,
    JSON.stringify([
      {
        ...event,
        version: next.library[0].updated_at,
        session: other,
        observed: "2026-01-05T00:00:00Z",
        percentage: 90,
      },
    ]),
  ]);
  assert.equal(result.changed, 0);
  next = await scalar("SELECT kobo_cloud_claim(false) AS value");
  result = await scalar("SELECT kobo_cloud_finish($1,'encrypted',$2::jsonb,false) AS value", [
    next.lease,
    JSON.stringify([
      {
        ...event,
        version: next.library[0].updated_at,
        observed: "2026-01-05T00:00:00Z",
        percentage: undefined,
        status: "read",
      },
    ]),
  ]);
  assert.equal(result.changed, 1);
  await db.exec("RESET ROLE");
  row = (await db.query("SELECT * FROM library_items WHERE id=$1", [item.id])).rows[0];
  assert.equal(row.status, "read");
  assert.equal(Number(row.progress_percent), 75);
  await as(owner);
  next = await scalar("SELECT kobo_cloud_claim(false) AS value");
  await db.query("SELECT kobo_cloud_disconnect()");
  assert.equal(
    await scalar("SELECT kobo_cloud_finish($1,'resurrect') AS value", [next.lease]),
    null,
  );
  const disconnected = await scalar("SELECT kobo_cloud_read() AS value");
  assert.equal(disconnected.ciphertext, null);
  assert.equal(disconnected.automatic, false);
  await db.exec("RESET ROLE");
  row = (await db.query("SELECT * FROM library_items WHERE id=$1", [item.id])).rows[0];
  assert.equal(Number(row.progress_percent), 75);
});
