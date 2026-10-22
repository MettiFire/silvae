import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("PostgreSQL: private fragments and conflict-safe progress migration", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
 CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 GRANT USAGE ON SCHEMA auth TO anon,authenticated;
 INSERT INTO auth.users(id,email) VALUES('11111111-1111-4111-8111-111111111111','one@example.test'),('22222222-2222-4222-8222-222222222222','two@example.test');`);
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20260901203401_c217526c-ddb4-42b5-98c0-99f528210932.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20261022010000_fragments_and_reading_progress.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    `INSERT INTO books(id,title,authors) VALUES('book','Example',ARRAY['Writer']);INSERT INTO library_items(user_id,book_id,status,total_pages) VALUES('11111111-1111-4111-8111-111111111111','book','reading',200);`,
  );
  const as = async (id) =>
    db.exec(
      `RESET ROLE;SET ROLE authenticated;SELECT set_config('request.jwt.claim.sub','${id}',false);`,
    );
  const one = "11111111-1111-4111-8111-111111111111",
    two = "22222222-2222-4222-8222-222222222222";
  const scalar = async (sql) => (await db.query(sql)).rows[0].value;
  let fragmentId, session;
  await t.test(
    "owner can save a fragment, reimport is idempotent and source text stays private",
    async () => {
      await as(one);
      fragmentId = await scalar(
        `INSERT INTO fragments(user_id,book_id,quote,dedupe_key) VALUES('${one}','book','A private quotation',repeat('a',64)) RETURNING id AS value`,
      );
      await db.query(
        `INSERT INTO fragments(user_id,book_id,quote,dedupe_key) VALUES('${one}','book','Do not overwrite edits',repeat('a',64)) ON CONFLICT(user_id,dedupe_key) DO NOTHING`,
      );
      assert.equal(await scalar("SELECT count(*)::int AS value FROM fragments"), 1);
      assert.equal(await scalar("SELECT quote AS value FROM fragments"), "A private quotation");
      assert.equal((await db.query("SELECT * FROM fragment_books()")).rows.length, 1);
    },
  );
  await t.test(
    "other users and anonymous callers cannot read or change fragments or progress events",
    async () => {
      await as(two);
      assert.equal((await db.query("SELECT * FROM fragments")).rows.length, 0);
      assert.equal((await db.query("SELECT * FROM fragment_books()")).rows.length, 0);
      assert.equal(
        (
          await db.query(
            `UPDATE fragments SET quote='attack' WHERE id='${fragmentId}' RETURNING id`,
          )
        ).rows.length,
        0,
      );
      await assert.rejects(
        db.query(
          `INSERT INTO fragments(user_id,book_id,quote,dedupe_key) VALUES('${one}','book','attack',repeat('b',64))`,
        ),
      );
      await db.exec("RESET ROLE;SET ROLE anon;");
      await assert.rejects(db.query("SELECT * FROM fragments"));
      await assert.rejects(db.query("SELECT * FROM reading_progress_events"));
    },
  );
  await t.test("trash is reversible and database validates empty fragments", async () => {
    await as(one);
    await db.query(`UPDATE fragments SET deleted_at=now() WHERE id='${fragmentId}'`);
    assert.equal(
      await scalar("SELECT count(*)::int AS value FROM fragments WHERE deleted_at IS NULL"),
      0,
    );
    await db.query(`UPDATE fragments SET deleted_at=NULL WHERE id='${fragmentId}'`);
    assert.equal(
      await scalar("SELECT count(*)::int AS value FROM fragments WHERE deleted_at IS NULL"),
      1,
    );
    await assert.rejects(
      db.query(
        `INSERT INTO fragments(user_id,book_id,quote,dedupe_key) VALUES('${one}','book',' ',repeat('c',64))`,
      ),
    );
  });
  await t.test(
    "progress stores percent independently of pages and rejects duplicate or old events",
    async () => {
      session = await scalar("SELECT reading_session_id AS value FROM library_items");
      assert.equal(
        await scalar(
          `SELECT record_reading_progress('book',42,now()-interval '2 minutes','kindle','event-1','${session}') AS value`,
        ),
        "applied",
      );
      assert.equal(await scalar("SELECT current_page AS value FROM library_items"), 0);
      assert.equal(await scalar("SELECT progress_percent::float AS value FROM library_items"), 42);
      assert.equal(
        await scalar(
          `SELECT record_reading_progress('book',90,now(),'kindle','event-1','${session}') AS value`,
        ),
        "duplicate",
      );
      assert.equal(
        await scalar(
          `SELECT record_reading_progress('book',10,now()-interval '3 minutes','kindle','event-old','${session}') AS value`,
        ),
        "stale",
      );
    },
  );
  await t.test(
    "newer manual page edits win and old sessions cannot overwrite a reread",
    async () => {
      await db.query("UPDATE library_items SET current_page=20 WHERE book_id='book'");
      assert.equal(await scalar("SELECT progress_source AS value FROM library_items"), "manual");
      assert.equal(
        await scalar(
          `SELECT record_reading_progress('book',80,now()-interval '1 minute','kobo','offline','${session}') AS value`,
        ),
        "stale",
      );
      const next = await scalar(`SELECT start_reading_session('book') AS value`);
      assert.notEqual(next, session);
      assert.equal(
        await scalar(
          `SELECT record_reading_progress('book',90,now(),'kindle','old-session','${session}') AS value`,
        ),
        "old_session",
      );
      assert.equal(await scalar("SELECT progress_percent::float AS value FROM library_items"), 0);
      assert.equal(
        await scalar(
          `SELECT record_reading_progress('book',70,now()+interval '1 second','manual','new-session','${next}') AS value`,
        ),
        "applied",
      );
      await assert.rejects(
        db.query(`SELECT record_reading_progress('book',101,now(),'manual','bad','${next}')`),
      );
      await assert.rejects(
        db.query(
          `SELECT record_reading_progress('book',50,now(),'manual','bad-complete','${next}',true)`,
        ),
      );
      await as(two);
      await assert.rejects(
        db.query(`SELECT record_reading_progress('book',99,now(),'kindle','attack','${next}')`),
      );
    },
  );
});
