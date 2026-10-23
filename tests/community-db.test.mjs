import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const one = "11111111-1111-4111-8111-111111111111",
  two = "22222222-2222-4222-8222-222222222222",
  three = "33333333-3333-4333-8333-333333333333";
test("Profile identity, image ownership and public club permissions", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;GRANT USAGE ON SCHEMA auth TO anon,authenticated;
 CREATE SCHEMA storage;CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text);ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;GRANT USAGE ON SCHEMA storage TO anon,authenticated;GRANT SELECT,INSERT,DELETE ON storage.objects TO anon,authenticated;CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$SELECT string_to_array($1,'/')$$;`);
  const migration = async (name) =>
    db.exec(await readFile(new URL("../supabase/migrations/" + name, import.meta.url), "utf8"));
  await migration("20260901203401_c217526c-ddb4-42b5-98c0-99f528210932.sql");
  await db.exec(
    `INSERT INTO auth.users(id,email) VALUES('${one}','private.name@example.test'),('${two}','other@example.test');UPDATE profiles SET username='chosen-name',display_name='Chosen' WHERE id='${two}';`,
  );
  await migration("20261023010000_profile_identity_and_images.sql");
  await migration("20261023020000_public_book_clubs.sql");
  const scalar = async (sql, args = []) => (await db.query(sql, args)).rows[0]?.value;
  const as = async (id) =>
    db.exec(
      `RESET ROLE;SET ROLE ${id ? "authenticated" : "anon"};SELECT set_config('request.jwt.claim.sub','${id ?? ""}',false);`,
    );
  await t.test("Automatic handles never expose email; chosen profiles are preserved", async () => {
    assert.equal(
      await scalar(`SELECT username AS value FROM profiles WHERE id='${one}'`),
      "lettore_" + one.replaceAll("-", ""),
    );
    assert.equal(
      await scalar(`SELECT display_name AS value FROM profiles WHERE id='${one}'`),
      null,
    );
    assert.equal(
      await scalar(`SELECT username AS value FROM profiles WHERE id='${two}'`),
      "chosen-name",
    );
    await db.exec(
      `INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES('${three}','new.private@example.test','{"username":"reader-chosen"}');`,
    );
    assert.equal(
      await scalar(`SELECT username AS value FROM profiles WHERE id='${three}'`),
      "reader-chosen",
    );
  });
  await t.test(
    "Only an image owner can upload/delete, and public images are readable",
    async () => {
      await as(one);
      await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES($1,$2)", [
        "profile-images",
        one + "/avatar.webp",
      ]);
      await assert.rejects(
        db.query("INSERT INTO storage.objects(bucket_id,name) VALUES($1,$2)", [
          "profile-images",
          two + "/spoof.webp",
        ]),
      );
      await as(two);
      assert.equal((await db.query("DELETE FROM storage.objects RETURNING id")).rows.length, 0);
      await as(null);
      assert.equal(await scalar("SELECT count(*)::int AS value FROM storage.objects"), 1);
    },
  );
  let club, topic;
  await t.test(
    "Club creator joins atomically; nonmembers cannot post or spoof another user",
    async () => {
      await as(one);
      club = await scalar(
        "INSERT INTO book_clubs(owner_id,name) VALUES($1,$2) RETURNING id AS value",
        [one, "Classic readers"],
      );
      assert.equal(
        await scalar("SELECT count(*)::int AS value FROM club_members WHERE club_id=$1", [club]),
        1,
      );
      assert.equal(
        (await db.query("DELETE FROM club_members WHERE club_id=$1 RETURNING user_id", [club])).rows
          .length,
        0,
      );
      await as(two);
      await assert.rejects(
        db.query("INSERT INTO club_topics(club_id,author_id,title,body) VALUES($1,$2,$3,$4)", [
          club,
          two,
          "Hello",
          "Not a member",
        ]),
      );
      await assert.rejects(
        db.query("INSERT INTO club_members(club_id,user_id) VALUES($1,$2)", [club, three]),
      );
      await db.query("INSERT INTO club_members(club_id,user_id) VALUES($1,$2)", [club, two]);
      await assert.rejects(
        db.query("INSERT INTO club_topics(club_id,author_id,title,body) VALUES($1,$2,$3,$4)", [
          club,
          one,
          "Spoof",
          "Other author",
        ]),
      );
      topic = await scalar(
        "INSERT INTO club_topics(club_id,author_id,title,body) VALUES($1,$2,$3,$4) RETURNING id AS value",
        [club, two, "First topic", "Words"],
      );
      assert.equal(
        (
          await db.query("UPDATE book_clubs SET name=$1 WHERE id=$2 RETURNING id", [
            "Hacked club",
            club,
          ])
        ).rows.length,
        0,
      );
      await assert.rejects(db.query("UPDATE book_clubs SET owner_id=$1 WHERE id=$2", [two, club]));
    },
  );
  await t.test(
    "Replies require membership; creator can moderate and leaving revokes posting",
    async () => {
      await as(three);
      await assert.rejects(
        db.query("INSERT INTO club_messages(topic_id,author_id,body) VALUES($1,$2,$3)", [
          topic,
          three,
          "No membership",
        ]),
      );
      await as(two);
      await db.query("INSERT INTO club_messages(topic_id,author_id,body) VALUES($1,$2,$3)", [
        topic,
        two,
        "Member reply",
      ]);
      await db.query("DELETE FROM club_members WHERE club_id=$1 AND user_id=$2", [club, two]);
      await assert.rejects(
        db.query("INSERT INTO club_messages(topic_id,author_id,body) VALUES($1,$2,$3)", [
          topic,
          two,
          "After leaving",
        ]),
      );
      await as(three);
      assert.equal((await db.query("DELETE FROM club_messages RETURNING id")).rows.length, 0);
      await as(one);
      assert.equal((await db.query("DELETE FROM club_messages RETURNING id")).rows.length, 1);
      await db.query("DELETE FROM book_clubs WHERE id=$1", [club]);
      assert.equal(await scalar("SELECT count(*)::int AS value FROM club_topics"), 0);
    },
  );
});
