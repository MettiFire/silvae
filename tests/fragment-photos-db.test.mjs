import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("photo-only fragments enforce ownership and storage follows public/follower/private/trash visibility", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  const owner = "11111111-1111-4111-8111-111111111111";
  const reader = "22222222-2222-4222-8222-222222222222";
  const path = `${owner}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webp`;
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated;
    INSERT INTO auth.users(id) VALUES('${owner}'),('${reader}');
    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA storage TO anon,authenticated;
    GRANT SELECT,INSERT,DELETE ON storage.objects TO anon,authenticated;`);
  for (const file of [
    "20260901203401_c217526c-ddb4-42b5-98c0-99f528210932.sql",
    "20261022010000_fragments_and_reading_progress.sql",
    "20261026020000_fragment_visibility.sql",
    "20261026021000_fragment_preference_visibility.sql",
    "20261027093800_fragment_photos.sql",
  ])
    await db.exec(
      await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"),
    );
  await db.exec("INSERT INTO books(id,title,authors) VALUES('book','Book',ARRAY['Writer'])");
  const as = async (id) =>
    db.exec(
      `RESET ROLE; SET ROLE ${id ? "authenticated" : "anon"}; SELECT set_config('request.jwt.claim.sub','${id ?? ""}',false)`,
    );
  const count = async () =>
    Number((await db.query("SELECT count(*) n FROM storage.objects")).rows[0].n);
  await as(owner);
  await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('fragment-photos',$1)", [
    path,
  ]);
  await db.query(
    "INSERT INTO fragments(user_id,book_id,quote,image_path,dedupe_key) VALUES($1,'book','',$2,repeat('a',64))",
    [owner, path],
  );
  assert.equal(await count(), 1);
  await as(reader);
  assert.equal(await count(), 0);
  await assert.rejects(
    db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('fragment-photos',$1)", [path]),
  );
  await assert.rejects(
    db.query(
      "INSERT INTO fragments(user_id,book_id,quote,image_path,dedupe_key) VALUES($1,'book','',$2,repeat('b',64))",
      [reader, path],
    ),
  );
  await as(owner);
  await db.query("INSERT INTO fragment_preferences(user_id,visibility) VALUES($1,'public')", [
    owner,
  ]);
  await as(null);
  assert.equal(await count(), 1);
  await as(owner);
  await db.exec("UPDATE fragment_preferences SET visibility='followers'");
  await as(reader);
  assert.equal(await count(), 0);
  await db.query("INSERT INTO follows(follower_id,following_id) VALUES($1,$2)", [reader, owner]);
  assert.equal(await count(), 1);
  assert.equal((await db.query("DELETE FROM storage.objects RETURNING id")).rows.length, 0);
  await as(owner);
  await db.exec("UPDATE fragments SET deleted_at=now()");
  await as(reader);
  assert.equal(await count(), 0);
  await as(owner);
  await db.exec(
    "UPDATE fragments SET deleted_at=null; UPDATE fragment_preferences SET visibility='private'",
  );
  await as(reader);
  assert.equal(await count(), 0);
});
