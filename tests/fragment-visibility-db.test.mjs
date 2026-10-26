import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("collection sharing is opt-in, follower-aware and never grants write access", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  const owner = "11111111-1111-4111-8111-111111111111",
    follower = "22222222-2222-4222-8222-222222222222",
    stranger = "33333333-3333-4333-8333-333333333333";
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
 CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 GRANT USAGE ON SCHEMA auth TO anon,authenticated;
 INSERT INTO auth.users(id) VALUES('${owner}'),('${follower}'),('${stranger}');`);
  for (const file of [
    "20260901203401_c217526c-ddb4-42b5-98c0-99f528210932.sql",
    "20261022010000_fragments_and_reading_progress.sql",
    "20261026020000_fragment_visibility.sql",
    "20261026021000_fragment_preference_visibility.sql",
  ])
    await db.exec(
      await readFile(new URL("../supabase/migrations/" + file, import.meta.url), "utf8"),
    );
  await db.exec(`INSERT INTO books(id,title,authors) VALUES('book','Book',ARRAY['Writer']);
 INSERT INTO fragments(user_id,book_id,quote,dedupe_key) VALUES('${owner}','book','Kept',repeat('a',64));
 INSERT INTO fragments(user_id,book_id,quote,dedupe_key,deleted_at) VALUES('${owner}','book','Trashed',repeat('b',64),now());
 INSERT INTO follows(follower_id,following_id) VALUES('${follower}','${owner}');`);
  const as = async (id) =>
    db.exec(
      `RESET ROLE; SET ROLE ${id ? "authenticated" : "anon"}; SELECT set_config('request.jwt.claim.sub','${id ?? ""}',false);`,
    );
  const count = async () =>
    Number((await db.query("SELECT count(*) AS n FROM fragments")).rows[0].n);
  const mode = async (visibility) => {
    await as(owner);
    await db.exec(
      `INSERT INTO fragment_preferences(user_id,visibility) VALUES('${owner}','${visibility}') ON CONFLICT(user_id) DO UPDATE SET visibility=excluded.visibility`,
    );
  };
  for (const viewer of [null, follower, stranger]) {
    await as(viewer);
    assert.equal(await count(), 0, "missing preferences are private");
  }
  await as(owner);
  assert.equal(await count(), 2, "owner can still see trash");
  await mode("public");
  for (const viewer of [null, follower, stranger]) {
    await as(viewer);
    assert.equal(await count(), 1, "public exposes only active fragments");
  }
  await as(stranger);
  assert.equal(
    (await db.query("UPDATE fragments SET quote='changed' RETURNING id")).rows.length,
    0,
  );
  assert.equal((await db.query("DELETE FROM fragments RETURNING id")).rows.length, 0);
  assert.equal(
    (await db.query("UPDATE fragment_preferences SET visibility='private' RETURNING user_id")).rows
      .length,
    0,
  );
  await assert.rejects(
    db.exec(`INSERT INTO fragment_preferences(user_id,visibility) VALUES('${owner}','public')`),
  );
  await mode("followers");
  await as(follower);
  assert.equal(await count(), 1);
  for (const viewer of [null, stranger]) {
    await as(viewer);
    assert.equal(await count(), 0);
  }
  await as(follower);
  await db.exec(`DELETE FROM follows WHERE follower_id='${follower}' AND following_id='${owner}'`);
  assert.equal(await count(), 0, "unfollow revokes access");
  await mode("private");
  for (const viewer of [null, follower, stranger]) {
    await as(viewer);
    assert.equal(await count(), 0, "switching back to private revokes access");
  }
  await as(owner);
  assert.equal(await count(), 2);
  await assert.rejects(db.exec("UPDATE fragment_preferences SET visibility='invalid'"));
});
