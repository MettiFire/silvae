import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("Cover reports are private, unique per reader and book, and deleted with the account", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  const reader = "11111111-1111-4111-8111-111111111111";
  const another = "22222222-2222-4222-8222-222222222222";
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
      AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    INSERT INTO auth.users VALUES ('${reader}'), ('${another}');
  `);
  await db.exec(
    await readFile(
      new URL("../supabase/migrations/20261121114013_cover_reports.sql", import.meta.url),
      "utf8",
    ),
  );

  const insert = (id) =>
    db.query(
      "INSERT INTO public.cover_reports (user_id, book_id, book_title, book_authors) VALUES ($1, 'ol:OL1W', 'A title', 'An author')",
      [id],
    );
  const select = () => db.query("SELECT user_id FROM public.cover_reports");
  const login = async (id) => {
    await db.exec("RESET ROLE; SET ROLE authenticated");
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id]);
  };

  await db.exec("SET ROLE anon");
  await assert.rejects(insert(reader), { code: "42501" });
  await assert.rejects(select(), { code: "42501" });
  await login(reader);
  await insert(reader);
  await assert.rejects(insert(reader), { code: "23505" });
  await assert.rejects(insert(another), { code: "42501" });
  assert.deepEqual((await select()).rows, [{ user_id: reader }]);

  await login(another);
  assert.deepEqual((await select()).rows, []);
  await insert(another);
  assert.deepEqual((await select()).rows, [{ user_id: another }]);

  await db.exec("RESET ROLE");
  await db.query("DELETE FROM auth.users WHERE id = $1", [reader]);
  assert.deepEqual((await select()).rows, [{ user_id: another }]);
});
