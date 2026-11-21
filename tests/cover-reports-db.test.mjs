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
    CREATE ROLE service_role BYPASSRLS;
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

  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20261121150241_verify_reported_book_covers.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const secret = "ab".repeat(32);
  await db.query(
    "INSERT INTO cover_repair_private.settings (secret_hash) VALUES (sha256(convert_to($1, 'UTF8')))",
    [secret],
  );
  await db.exec("SET ROLE anon");
  const claim = (key) => db.query("SELECT * FROM public.run_cover_repair($1)", [key]);
  const finish = (url) =>
    db.query("SELECT * FROM public.run_cover_repair($1, 'ol:OL1W', $2)", [secret, url]);
  const image = "https://covers.openlibrary.org/b/id/1-M.jpg?default=false";
  await assert.rejects(claim(secret), { code: "42501" });
  await db.exec("RESET ROLE; SET ROLE service_role");
  await assert.rejects(claim("0".repeat(64)), { code: "42501" });
  await assert.rejects(finish(image), { code: "22023" });
  assert.deepEqual((await claim(secret)).rows, [{ book_id: "ol:OL1W" }]);
  assert.deepEqual((await claim(secret)).rows, []);
  await assert.rejects(finish("https://example.test/image.jpg"), { code: "22023" });
  await finish(image);
  await db.exec("RESET ROLE; SET ROLE anon");
  assert.deepEqual((await db.query("SELECT cover_url FROM public.verified_book_covers")).rows, [
    { cover_url: image },
  ]);
  await db.exec(
    "RESET ROLE; UPDATE public.cover_reports SET last_checked_at = now() - interval '2 days'; SET ROLE service_role",
  );
  assert.deepEqual((await claim(secret)).rows, []);
});
