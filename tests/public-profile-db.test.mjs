import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("public profile exposes author follows while private lists and auth metadata stay private", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  const one = "11111111-1111-4111-8111-111111111111",
    two = "22222222-2222-4222-8222-222222222222";
  await db.exec(
    `CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;GRANT USAGE ON SCHEMA auth TO anon,authenticated;INSERT INTO auth.users VALUES('${one}','one@example.test','{"followed_authors_v1":[{"id":"OL1A","name":"Writer","followedAt":"2026-01-01"}],"private_note":"not-public"}'),('${two}','two@example.test','{}');`,
  );
  for (const name of [
    "20260901203401_c217526c-ddb4-42b5-98c0-99f528210932.sql",
    "20261022030000_public_author_follows.sql",
  ])
    await db.exec(
      await readFile(new URL("../supabase/migrations/" + name, import.meta.url), "utf8"),
    );
  const as = async (id) =>
    db.exec(
      `RESET ROLE;SET ROLE ${id ? "authenticated" : "anon"};SELECT set_config('request.jwt.claim.sub','${id ?? ""}',false)`,
    );
  const scalar = async (q, args = []) => (await db.query(q, args)).rows[0].value;
  await t.test(
    "backfill publishes only allowed author fields and keeps author tables read-only",
    async () => {
      await as(null);
      const rows = (await db.query("SELECT * FROM author_follows")).rows;
      assert.equal(rows.length, 1);
      assert.equal(rows[0].author_name, "Writer");
      assert.equal(Object.keys(rows[0]).length, 4);
      await assert.rejects(db.query("SELECT * FROM auth.users"));
      await assert.rejects(
        db.query(
          `INSERT INTO author_follows(user_id,author_id,author_name) VALUES('${one}','OL2A','Attack')`,
        ),
      );
      await as(two);
      await assert.rejects(db.query("SELECT publish_author_follows($1,$2)", [one, "{}"]));
    },
  );
  await t.test(
    "metadata updates publish unfollows and ignore malformed entries without exposing unrelated data",
    async () => {
      await db.exec("RESET ROLE");
      await db.query("UPDATE auth.users SET raw_user_meta_data=$1 WHERE id=$2", [
        JSON.stringify({
          followed_authors_v1: [
            { id: "OL2A", name: "New writer", followedAt: "invalid" },
            { id: "bad", name: "Bad" },
            { id: "OL2A", name: "Duplicate" },
          ],
          secret: "never",
        }),
        one,
      ]);
      await as(null);
      assert.equal(await scalar("SELECT count(*)::int AS value FROM author_follows"), 1);
      assert.equal(await scalar("SELECT author_name AS value FROM author_follows"), "New writer");
      await db.exec("RESET ROLE");
      await db.query("UPDATE auth.users SET raw_user_meta_data='{}' WHERE id=$1", [one]);
      await as(null);
      assert.equal(await scalar("SELECT count(*)::int AS value FROM author_follows"), 0);
    },
  );
  await t.test(
    "owner creates and edits lists; visitors cannot read private list contents or write to another reader",
    async () => {
      await as(one);
      const publicId = await scalar(
        "INSERT INTO book_lists(user_id,name,is_public) VALUES($1,'Public',true) RETURNING id AS value",
        [one],
      );
      const privateId = await scalar(
        "INSERT INTO book_lists(user_id,name,is_public) VALUES($1,'Private',false) RETURNING id AS value",
        [one],
      );
      await db.query("INSERT INTO books(id,title) VALUES('book','Example')");
      await db.query("INSERT INTO list_items(list_id,book_id) VALUES($1,'book'),($2,'book')", [
        publicId,
        privateId,
      ]);
      await as(two);
      assert.equal(await scalar("SELECT count(*)::int AS value FROM book_lists"), 1);
      assert.equal(await scalar("SELECT count(*)::int AS value FROM list_items"), 1);
      await assert.rejects(
        db.query("INSERT INTO list_items(list_id,book_id) VALUES($1,'book')", [privateId]),
      );
      assert.equal(
        (await db.query("UPDATE book_lists SET name='Attack' WHERE id=$1 RETURNING id", [publicId]))
          .rows.length,
        0,
      );
      await as(one);
      await db.query("UPDATE book_lists SET is_public=false WHERE id=$1", [publicId]);
      await as(null);
      assert.equal(await scalar("SELECT count(*)::int AS value FROM book_lists"), 0);
      assert.equal(await scalar("SELECT count(*)::int AS value FROM list_items"), 0);
    },
  );
  await t.test(
    "community average includes only completed books with a real score and returns null without votes",
    async () => {
      await as(one);
      await db.query(
        "INSERT INTO library_items(user_id,book_id,status,rating) VALUES($1,'book','read',4)",
        [one],
      );
      await as(two);
      await db.query(
        "INSERT INTO library_items(user_id,book_id,status,rating) VALUES($1,'book','reading',1)",
        [two],
      );
      await as(null);
      const result = (await db.query("SELECT * FROM book_community_rating('book')")).rows[0];
      assert.equal(Number(result.average_rating), 4);
      assert.equal(Number(result.ratings_count), 1);
      const empty = (await db.query("SELECT * FROM book_community_rating('unknown')")).rows[0];
      assert.equal(empty.average_rating, null);
      assert.equal(Number(empty.ratings_count), 0);
    },
  );
});
