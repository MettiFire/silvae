import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("Account deletion is isolated, atomic and cascades personal data while preserving shared books", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  const one = "11111111-1111-4111-8111-111111111111",
    two = "22222222-2222-4222-8222-222222222222";
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated;`);
  for (const name of [
    "20260901203401_c217526c-ddb4-42b5-98c0-99f528210932.sql",
    "20261022010000_fragments_and_reading_progress.sql",
    "20261022020000_reader_connections.sql",
    "20261022030000_public_author_follows.sql",
    "20261022040000_delete_own_account.sql",
  ])
    await db.exec(
      await readFile(new URL("../supabase/migrations/" + name, import.meta.url), "utf8"),
    );
  await db.exec(`INSERT INTO auth.users VALUES
    ('${one}','one@example.test','{"followed_authors_v1":[{"id":"OL1A","name":"Writer","followedAt":"2026-01-01"}]}'),
    ('${two}','two@example.test','{}');
    INSERT INTO books(id,title,authors) VALUES('shared','Shared',ARRAY['Writer']);
    INSERT INTO library_items(user_id,book_id) VALUES('${one}','shared'),('${two}','shared');
    INSERT INTO fragments(user_id,book_id,quote,dedupe_key) VALUES('${one}','shared','Private quote',repeat('a',64));
    INSERT INTO reviews(user_id,book_id,body) VALUES('${one}','shared','Review');
    INSERT INTO book_lists(id,user_id,name) VALUES('${one}','${one}','Personal'),('${two}','${two}','Other');
    INSERT INTO list_items(list_id,book_id) VALUES('${one}','shared'),('${two}','shared');
    INSERT INTO saved_lists(user_id,list_id) VALUES('${two}','${one}'),('${one}','${two}');
    INSERT INTO follows(follower_id,following_id) VALUES('${one}','${two}'),('${two}','${one}');
    INSERT INTO challenges(user_id,year,goal) VALUES('${one}',2026,30);
    INSERT INTO activities(user_id,type,book_id) VALUES('${one}','added','shared');
    INSERT INTO dismissed_books(user_id,book_id) VALUES('${one}','shared');
    SELECT set_config('request.jwt.claim.sub','${one}',false);
    SELECT create_reader_connection('Test','kobo',repeat('a',64));`);
  await db.exec(`
    INSERT INTO reader_documents(connection_id,user_id,external_id,title)
      SELECT id,'${one}','book-file','Private document' FROM reader_connections WHERE user_id='${one}';
    INSERT INTO reader_annotations(document_id,user_id,external_id,quote)
      SELECT id,'${one}','quote-1','Private annotation' FROM reader_documents WHERE user_id='${one}';
    INSERT INTO reading_progress_events(user_id,book_id,session_id,percentage,source,observed_at)
      SELECT user_id,book_id,reading_session_id,20,'manual',now() FROM library_items WHERE user_id='${one}';
  `);
  const as = async (id) =>
    db.exec(
      `RESET ROLE;SET ROLE ${id ? "authenticated" : "anon"};SELECT set_config('request.jwt.claim.sub','${id ?? ""}',false)`,
    );
  await as(null);
  await assert.rejects(
    db.query("SELECT delete_own_account($1,$2)", [one, "ELIMINA"]),
    /permission denied/,
  );
  await db.exec(
    "RESET ROLE;SET ROLE authenticated;SELECT set_config('request.jwt.claim.sub','',false)",
  );
  await assert.rejects(db.query("SELECT delete_own_account($1,$2)", [one, "ELIMINA"]), /Sessione/);
  await as(one);
  await assert.rejects(db.query("SELECT delete_own_account($1,$2)", [two, "ELIMINA"]), /Sessione/);
  await assert.rejects(db.query("SELECT delete_own_account($1,$2)", [one, "wrong"]), /ELIMINA/);
  // A failed cascading delete must roll back the entire account removal.
  await db.exec(`RESET ROLE;CREATE FUNCTION public.block_test_deletion() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'test failure'; END$$;
    CREATE TRIGGER block_test BEFORE DELETE ON public.library_items FOR EACH ROW EXECUTE FUNCTION public.block_test_deletion();`);
  await as(one);
  await assert.rejects(
    db.query("SELECT delete_own_account($1,$2)", [one, "ELIMINA"]),
    /test failure/,
  );
  await db.exec("RESET ROLE");
  assert.equal((await db.query("SELECT count(*)::int AS n FROM auth.users")).rows[0].n, 2);
  await db.exec("DROP TRIGGER block_test ON public.library_items");
  await as(one);
  assert.equal(
    (await db.query("SELECT delete_own_account($1,$2) AS deleted", [one, "ELIMINA"])).rows[0]
      .deleted,
    true,
  );
  await assert.rejects(
    db.query("SELECT delete_own_account($1,$2)", [one, "ELIMINA"]),
    /non trovato/,
  );
  await db.exec("RESET ROLE");
  for (const table of [
    "fragments",
    "reviews",
    "saved_lists",
    "follows",
    "challenges",
    "activities",
    "dismissed_books",
    "reader_documents",
    "reader_annotations",
    "reading_progress_events",
    "reader_connections",
    "reader_credentials",
    "author_follows",
  ]) {
    assert.equal(
      (await db.query(`SELECT count(*)::int AS n FROM public.${table}`)).rows[0].n,
      0,
      table,
    );
  }
  for (const table of [
    "auth.users",
    "public.profiles",
    "public.library_items",
    "public.book_lists",
    "public.list_items",
    "public.books",
  ]) {
    assert.equal((await db.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n, 1, table);
  }
  assert.equal((await db.query("SELECT id FROM auth.users")).rows[0].id, two);
});
