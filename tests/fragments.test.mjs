import test from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import {
  parseKindleClippings,
  parseFragmentCSV,
  parseMarkdownFragments,
  prepareFragmentImport,
  matchFragmentBook,
} from "../src/lib/fragment-import.ts";
import {
  fragmentKey,
  validateFragment,
  saveFragment,
  moveFragmentToTrash,
} from "../src/lib/fragments.ts";
import { parseProgressPercent, saveManualPercent } from "../src/lib/reading-progress.ts";
const encode = (s) => new TextEncoder().encode(s);
const b = {
  id: "googleABC123",
  title: "Example",
  authors: ["Writer"],
  cover_url: null,
  page_count: 200,
  published_year: 2020,
  categories: [],
  description: null,
};
const draft = {
  kind: "quote",
  quote: "  A sentence  ",
  note: "A thought",
  position: "Pagina 10",
  tags: ["memory", "memory", " "],
  favorite: true,
};
test("Kindle clippings support English/Italian highlights and skip notes with an explicit notice", () => {
  const text =
    "Example (Writer)\n- Your Highlight on page 10 | Location 120-125 | Added on Thursday\n\nA sentence.\n==========\nExample (Writer)\n- La tua evidenziazione alla pagina 12 | posizione 200-205\n\nUn’altra frase.\n==========\nExample (Writer)\n- Your Note on Location 220\n\nOnly a note\n==========";
  const parsed = parseKindleClippings(text);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].title, "Example");
  assert.deepEqual(parsed.rows[0].authors, ["Writer"]);
  assert.match(parsed.rows[1].position, /200-205/);
  assert.equal(parsed.rows[0].quote, "A sentence.");
  assert.equal(parsed.notices.length, 1);
  assert.ok(!("percentage" in parsed.rows[0]));
  assert.equal(prepareFragmentImport("My Clippings.txt", encode(text)).rows.length, 2);
});
test("CSV multiline quotations preserve text and understand general Title/Author exports", () => {
  const parsed = parseFragmentCSV(
    'Title,Author,Highlight,Note,tags\nExample,Writer,"First line\nSecond line",Thought,"memory,life"',
  );
  assert.equal(parsed.rows[0].title, "Example");
  assert.equal(parsed.rows[0].quote, "First line\nSecond line");
  assert.equal(parsed.rows[0].note, "Thought");
  assert.deepEqual(parsed.rows[0].tags, ["memory", "life"]);
});
test("Bookshelf ZIP joins Cards to Books without losing quotation/note kind or source ids", () => {
  const zip = zipSync({
    "Bookshelf-Books.csv": strToU8(
      "ID,Title,Author,Book Source\ngoogleABC123,Example,Writer,GoogleBooks",
    ),
    "Bookshelf-Cards.csv": strToU8(
      "ID,Book ID,Book Title,Type,Title,Details,Study Level,Date Added,Is Kindle Highlight,Kindle Location\ncard1,googleABC123,Example,Citazione,Chapter,<p>A sentence</p>,1,21 ott 2026,false,120\ncard2,googleABC123,Example,Nota,Thought,A reflection,1,21 ott 2026,false,",
    ),
  });
  const { rows } = prepareFragmentImport("Bookshelf.zip", zip);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].quote, "A sentence");
  assert.equal(rows[1].kind, "note");
  assert.equal(rows[0].sourceRef, "card1");
  assert.equal(rows[0].sourceBookId, b.id);
  assert.equal(matchFragmentBook(rows[0], [b]), b.id);
});
test("Markdown supports multiline blockquotes; plain text requires review and unverified titles are not auto-linked", () => {
  const parsed = parseMarkdownFragments(
    "# Example\nAuthor: Writer\n\n> Line one\n> Line two\n\n> Another quote",
  );
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].quote, "Line one\nLine two");
  assert.equal(matchFragmentBook(parsed.rows[0], [b]), b.id);
  assert.equal(matchFragmentBook({ ...parsed.rows[0], authors: [] }, [b]), "");
  assert.equal(matchFragmentBook(parsed.rows[0], [b, { ...b, id: "edition2" }]), "");
  assert.equal(parseMarkdownFragments("Unstructured text").notices.length, 1);
  assert.throws(
    () => prepareFragmentImport("file.txt", new Uint8Array(10 * 1024 * 1024 + 1)),
    /10 MB/,
  );
});
test("fingerprints deduplicate reimports without erasing edits and scope them to the correct book", async () => {
  assert.equal(
    await fragmentKey("a", "kindle", null, "A  sentence", "12"),
    await fragmentKey("a", "kindle", null, "A sentence", "12"),
  );
  assert.equal(
    await fragmentKey("a", "bookshelf", "card1", "before", "12"),
    await fragmentKey("a", "bookshelf", "card1", "edited", "other"),
  );
  assert.notEqual(
    await fragmentKey("a", "kindle", null, "A sentence", "12"),
    await fragmentKey("b", "kindle", null, "A sentence", "12"),
  );
  const valid = validateFragment({
    ...draft,
    sourceBookId: "do not write this",
    title: "import metadata",
  });
  assert.deepEqual(valid, { ...draft, quote: "A sentence", tags: ["memory"] });
  assert.ok(!("title" in valid));
  assert.throws(() => validateFragment({ ...draft, quote: " " }));
});
test("changed account cannot save fragments, trash another account or submit progress", async () => {
  let writes = 0;
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "other" } }, error: null }) },
    from: () => {
      writes++;
      throw Error("must not write");
    },
    rpc: () => {
      writes++;
      throw Error("must not write");
    },
  };
  await assert.rejects(saveFragment(client, "reader", b.id, draft));
  await assert.rejects(moveFragmentToTrash(client, "reader", "id"));
  await assert.rejects(saveManualPercent(client, "reader", b.id, "session", 42, false));
  assert.equal(writes, 0);
});
test("manual percentages validate decimals and explicit completion without inventing page counts", async () => {
  assert.equal(parseProgressPercent("42,5"), 42.5);
  for (const bad of ["", "-1", "101", "Infinity", "1e2"])
    assert.throws(() => parseProgressPercent(bad));
  let args;
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "reader" } }, error: null }) },
    rpc: async (name, values) => {
      args = values;
      return { data: "applied", error: null };
    },
  };
  await saveManualPercent(client, "reader", b.id, "session", 42, false);
  assert.equal(args.p_percentage, 42);
  assert.ok(!("p_page" in args));
  assert.equal(args.p_finished, false);
  await saveManualPercent(client, "reader", b.id, "session", 42, true);
  assert.equal(args.p_percentage, 100);
  assert.equal(args.p_finished, true);
  client.rpc = async () => ({ data: "stale", error: null });
  await assert.rejects(saveManualPercent(client, "reader", b.id, "session", 42, false), /altrove/);
});
