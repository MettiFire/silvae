import test from "node:test";
import assert from "node:assert/strict";
import { AWARD_DATA } from "../src/data/reading-awards.ts";
import {
  CHALLENGE_CATALOGUE,
  createEnrollment,
  challengeSlots,
  challengeProgress,
  eligibleReading,
  validateEnrollment,
  decodeEnrollments,
} from "../src/lib/reading-challenges.ts";
const joined = "2026-10-21T14:00:00.000Z";
const item = (id, title, author, extra = {}) => ({
  id: `row-${id}`,
  user_id: "reader",
  book_id: id,
  status: "read",
  current_page: 200,
  total_pages: 200,
  rating: null,
  favorite: false,
  started_at: null,
  finished_at: "2026-10-21T00:00:00.000Z",
  reread_count: 0,
  last_reread_at: null,
  needs_review: false,
  created_at: "2026-01-01",
  updated_at: joined,
  books: {
    id,
    title,
    authors: [author],
    cover_url: null,
    published_year: 2020,
    page_count: 200,
    categories: [],
    description: null,
  },
  ...extra,
});

test("All nine paths exist and official award coverage is complete", () => {
  assert.equal(CHALLENGE_CATALOGUE.length, 9);
  assert.equal(new Set(CHALLENGE_CATALOGUE.map((c) => c.id)).size, 9);
  assert.equal(AWARD_DATA.strega.length, 80);
  assert.equal(AWARD_DATA.booker.length, 60);
  assert.equal(AWARD_DATA.international.length, 11);
  assert.equal(AWARD_DATA.europe.length, 14);
  assert.equal(AWARD_DATA.nobel.length, 123);
  assert.equal(
    AWARD_DATA.booker.some((w) => w.year === 2026),
    false,
  );
  assert.equal(AWARD_DATA.booker.filter((w) => w.year === 2019).length, 2);
  assert.equal(AWARD_DATA.europe.filter((w) => w.year === 2022).length, 2);
  assert.equal(
    AWARD_DATA.international.every((w) => w.year >= 2016),
    true,
  );
  assert.equal(
    AWARD_DATA.nobel.every((w) => w.title === null),
    true,
  );
});
test("Award progress matches titles and authors, never a title by the wrong author", () => {
  const e = { ...createEnrollment("strega", joined), fromYear: 2017, toYear: 2017 };
  const p = challengeProgress(e, [
    item("wrong", "Le otto montagne", "Un altro autore"),
    item("right", "Le otto montagne", "Paolo Cognetti"),
  ]);
  assert.equal(p.done, 1);
  assert.equal(p.slots.find(s => s.label === "2017").completed.book_id, "right");
  assert.equal(p.total, AWARD_DATA.strega.length);
  assert.equal(p.complete, false);
});
test("Manual association supports translated editions and disappears when the reading is undone", () => {
  const e = { ...createEnrollment("booker", joined), fromYear: 2019, toYear: 2019 };
  const slot = challengeSlots(e).find((s) => s.options[0].author === "Bernardine Evaristo");
  e.assignments[slot.id] = { bookId: "italian" };
  assert.equal(
    challengeProgress(e, [item("italian", "Ragazza, donna, altro", "Bernardine Evaristo")]).done,
    1,
  );
  assert.equal(
    challengeProgress(e, [
      item("italian", "Ragazza, donna, altro", "Bernardine Evaristo", { status: "reading" }),
    ]).done,
    0,
  );
});
test("Birth-year challenge has one stage per award year; either joint winner qualifies", () => {
  const e = {
    ...createEnrollment("birth-year", joined),
    family: "booker",
    fromYear: 2019,
    toYear: 2019,
  };
  assert.equal(challengeSlots(e).length, 1);
  assert.equal(challengeSlots(e)[0].options.length, 2);
  assert.equal(
    challengeProgress(e, [item("a", "The Testaments", "Margaret Atwood")]).complete,
    true,
  );
});
test("Nobel counts any book by the laureate and counts that author only once", () => {
  const e = { ...createEnrollment("nobel", joined), fromYear: 1926, toYear: 1926 };
  assert.equal(
    challengeProgress(e, [
      item("a", "Canne al vento", "Grazia Deledda"),
      item("b", "Cenere", "Grazia Deledda"),
    ]).done,
    1,
  );
});
test("Historical readings, missing dates, joining day and inclusive deadlines follow the chosen rules", () => {
  const e = { ...createEnrollment("countries", joined), includePast: false, deadline: "2026-10-22" };
  assert.equal(eligibleReading(item("a", "x", "y"), e), true);
  assert.equal(
    eligibleReading(item("a", "x", "y", { finished_at: "2026-10-20T23:59:59Z" }), e),
    false,
  );
  assert.equal(
    eligibleReading(item("a", "x", "y", { finished_at: "2026-10-22T23:59:59Z" }), e),
    true,
  );
  assert.equal(
    eligibleReading(item("a", "x", "y", { finished_at: "2026-10-23T00:00:00Z" }), e),
    false,
  );
  assert.equal(eligibleReading(item("a", "x", "y", { finished_at: null }), e), false);
  assert.equal(
    eligibleReading(item("a", "x", "y", { finished_at: null }), {
      ...e,
      includePast: true,
      deadline: null,
    }),
    true,
  );
});
test("One book or two editions of one work cannot fill two thematic slots", () => {
  const e = createEnrollment("comfort-zone", joined);
  e.assignments = {
    "genre-0": { bookId: "a" },
    "genre-1": { bookId: "b" },
    "genre-2": { bookId: "a" },
  };
  assert.equal(
    challengeProgress(e, [item("a", "Una raccolta", "Autore"), item("b", "Una raccolta", "Autore")])
      .done,
    1,
  );
});
test("Countries require confirmed distinct countries and distinct books", () => {
  const e = createEnrollment("countries", joined);
  e.assignments = {
    "country-1": { bookId: "a", country: "JP" },
    "country-2": { bookId: "b", country: "jp" },
    "country-3": { bookId: "c" },
  };
  assert.equal(
    challengeProgress(e, [
      item("a", "Libro A", "Autore A"),
      item("b", "Libro B", "Autore B"),
      item("c", "Libro C", "Autore C"),
    ]).done,
    1,
  );
});
test("Backlog freezes a selection rather than taking later additions to the library", () => {
  const e = { ...createEnrollment("backlog", joined), backlogIds: ["a", "b", "c", "d", "e"] };
  const pending = e.backlogIds.map((id) =>
    item(id, `Libro ${id}`, `Autore ${id}`, { status: "to_read" }),
  );
  assert.equal(validateEnrollment(e, pending), null);
  const progress = challengeProgress(e, [
    ...pending.filter((i) => i.book_id !== "a"),
    item("a", "Libro a", "Autore a"),
    item("new", "Aggiunto dopo", "Nuovo autore"),
  ]);
  assert.equal(progress.total, 5);
  assert.equal(progress.done, 1);
  assert.match(validateEnrollment({ ...e, backlogIds: ["a"] }, pending), /esattamente/);
});
test("Award archive contains only verified winners and exposes its latest catalogued year", () => {
  const e = createEnrollment("booker", joined);
  assert.equal(e.toYear, 2025);
  assert.equal(
    challengeSlots(e).every((s) => s.options.every((w) => w.year <= 2025)),
    true,
  );
});
test("Malformed account data never crashes the explorer or creates duplicate subscriptions", () => {
  const e = createEnrollment("strega", joined);
  assert.deepEqual(decodeEnrollments(null), []);
  assert.deepEqual(
    decodeEnrollments([
      { id: "unknown" },
      null,
      { ...e, assignments: [] },
      { ...e, family: "unknown" },
    ]),
    [],
  );
  assert.equal(decodeEnrollments([e, e]).length, 1);
  assert.match(validateEnrollment({ ...e, deadline: "2020-01-01" }, []), /scadenza/);
});

test("World challenge groups every library book by author nationality, including translations", () => {
  const e = createEnrollment("countries", joined);
  e.assignments["country-1"] = { bookId: "", country: "IT" };
  const library = [
    item("a", "Opera italiana", "Italo Calvino"),
    item("b", "English translation", "Calvino, Italo", { status: "to_read" }),
    item("c", "Altra opera", "Italo Calvino"),
  ];
  const p = challengeProgress(e, library, { italocalvino: ["IT"] });
  assert.equal(p.done, 1);
  assert.deepEqual(
    p.slots[0].matching.map((i) => i.book_id),
    ["a", "b", "c"],
  );
  assert.equal(decodeEnrollments([e])[0].assignments["country-1"].country, "IT");
});
test("World challenge automatically selects distinct countries and respects dates and reading status", () => {
  const e = createEnrollment("countries", joined);
  e.includePast = false;
  const p = challengeProgress(
    e,
    [
      item("a", "A", "Autore A"),
      item("b", "B", "Autore B", { status: "reading" }),
      item("c", "C", "Autore C", { finished_at: "2025-01-01" }),
    ],
    { autorea: ["IT"], autoreb: ["FR"], autorec: ["DE"] },
  );
  assert.equal(p.done, 1);
  assert.equal(p.slots[0].country, "IT");
  assert.equal(new Set(p.slots.flatMap((s) => (s.country ? [s.country] : []))).size, 3);
});
test("A manual author confirmation applies to their other books without inventing unknown origins", () => {
  const e = createEnrollment("countries", joined);
  e.assignments["country-1"] = { bookId: "a", country: "IT" };
  const p = challengeProgress(e, [
    item("a", "A", "Autore A", { status: "to_read" }),
    item("b", "B", "Autore A"),
    item("c", "C", "Unknown"),
  ]);
  assert.equal(p.done, 1);
  assert.equal(p.slots[0].completed.book_id, "b");
  assert.equal(p.slots[0].matching.length, 2);
  assert.equal(p.slots.filter((s) => s.country).length, 1);
});

test("Annual awards always include the full archive and past readings, preserving legacy assignments", () => {
  const old = {...createEnrollment("strega",joined),fromYear:2017,toYear:2017,includePast:false,deadline:"2026-10-22",assignments:{[AWARD_DATA.strega.find(w=>w.year===2017).id]:{bookId:"translated"}}};
  const restored=decodeEnrollments([old])[0];
  assert.equal(restored.fromYear,1947);assert.equal(restored.includePast,true);assert.equal(restored.deadline,null);assert.deepEqual(restored.assignments,old.assignments);
  const p=challengeProgress(old,[item("translated","The Eight Mountains","Paolo Cognetti",{finished_at:null})]);
  assert.equal(p.total,AWARD_DATA.strega.length);assert.equal(p.done,1);assert.equal(p.percent,Math.round(100/AWARD_DATA.strega.length));
  assert.equal(challengeProgress(old,[item("translated","x","y",{status:"reading"})]).done,0);
});
