import { AWARD_DATA, type AwardFamily, type AwardWinner } from "../data/reading-awards.ts";
import type { LibraryItem } from "./library";

export type ChallengeId = AwardFamily | "birth-year" | "countries" | "comfort-zone" | "backlog";
export type ChallengeDefinition = {
  id: ChallengeId;
  name: string;
  tagline: string;
  description: string;
  kind: "award" | "thematic";
  color: string;
};
export const CHALLENGE_CATALOGUE: ChallengeDefinition[] = [
  {
    id: "strega",
    name: "Una vita da Strega",
    tagline: "La narrativa italiana, un premio alla volta",
    description:
      "Percorri i vincitori del Premio Strega dal 1947. Scegli tutto l’albo, gli ultimi dieci anni o il tuo decennio.",
    kind: "award",
    color: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  {
    id: "booker",
    name: "Il giro del mondo con il Booker",
    tagline: "Storie che hanno lasciato il segno",
    description:
      "Leggi i vincitori del Booker Prize dal 1969. Negli anni ex aequo trovi entrambi i libri premiati.",
    kind: "award",
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  {
    id: "international",
    name: "Voci dal mondo",
    tagline: "Oltre i confini della tua lingua",
    description:
      "I libri dell’International Booker dal 2016, quando il riconoscimento è diventato un premio a un singolo libro tradotto.",
    kind: "award",
    color: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  {
    id: "nobel",
    name: "Passaporto Nobel",
    tagline: "Un’opera per ogni voce premiata",
    description:
      "Leggi almeno un’opera di ogni autore Nobel per la letteratura. Il riconoscimento riguarda l’autore: scegli tu quale suo libro leggere.",
    kind: "award",
    color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  },
  {
    id: "europe",
    name: "Europa in biblioteca",
    tagline: "Un continente di storie",
    description: "Scopri i libri vincitori dello Strega Europeo dal 2014, compresi gli ex aequo.",
    kind: "award",
    color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  },
  {
    id: "birth-year",
    name: "Il tuo anno letterario",
    tagline: "Una storia per ogni anno della tua vita",
    description:
      "Scegli un premio e leggi un vincitore per ogni anno a partire dalla tua nascita. In un anno ex aequo basta uno dei vincitori.",
    kind: "thematic",
    color: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  {
    id: "countries",
    name: "Dodici mesi, dodici paesi",
    tagline: "Il tuo passaporto di lettura",
    description:
      "Dodici libri di autori provenienti da dodici paesi diversi. Associa un libro e conferma il paese per ogni tappa; puoi seguirle nell’ordine che preferisci.",
    kind: "thematic",
    color: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  },
  {
    id: "comfort-zone",
    name: "Fuori dalla comfort zone",
    tagline: "Sei modi per sorprenderti",
    description:
      "Una poesia, un testo teatrale, un saggio, una graphic novel, un classico e un genere mai provato: scegli un libro diverso per ogni tappa.",
    kind: "thematic",
    color: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  {
    id: "backlog",
    name: "La montagna dei “prima o poi”",
    tagline: "Dai una possibilità a chi aspetta già",
    description:
      "Scegli 5, 10 o 20 libri dalla tua lista Da leggere e portali al traguardo. La selezione viene fissata all’iscrizione.",
    kind: "thematic",
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
];
export const AWARD_NAMES: Record<AwardFamily, string> = {
  strega: "Premio Strega",
  booker: "Booker Prize",
  international: "International Booker",
  europe: "Strega Europeo",
  nobel: "Nobel per la letteratura",
};
export type SlotAssignment = { bookId: string; country?: string };
export type ChallengeEnrollment = {
  id: ChallengeId;
  joinedAt: string;
  includePast: boolean;
  deadline: string | null;
  fromYear: number;
  toYear: number;
  family: AwardFamily;
  target: number;
  backlogIds: string[];
  assignments: Record<string, SlotAssignment>;
};
export type ChallengeSlot = {
  id: string;
  label: string;
  options: AwardWinner[];
  fixedBookId?: string;
};
const key = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const authorKey = (s: string) => key(s).split(" ").sort().join(" ");
export function awardBounds(family: AwardFamily) {
  const years = AWARD_DATA[family].map((row) => row.year);
  return { min: Math.min(...years), max: Math.max(...years) };
}
export function createEnrollment(
  id: ChallengeId,
  now = new Date().toISOString(),
): ChallengeEnrollment {
  const family: AwardFamily = id in AWARD_DATA ? (id as AwardFamily) : "strega";
  const { min, max } = awardBounds(family);
  return {
    id,
    joinedAt: now,
    includePast: id !== "backlog",
    deadline: null,
    fromYear: id === "birth-year" ? 1990 : Math.max(min, max - 9),
    toYear: max,
    family,
    target: 5,
    backlogIds: [],
    assignments: {},
  };
}
export function challengeSlots(enrollment: ChallengeEnrollment): ChallengeSlot[] {
  const { id } = enrollment;
  if (id === "countries")
    return Array.from({ length: 12 }, (_, i) => ({
      id: `country-${i + 1}`,
      label: `Paese ${i + 1}`,
      options: [],
    }));
  if (id === "comfort-zone")
    return ["Poesia", "Teatro", "Saggio", "Graphic novel", "Classico", "Un genere mai provato"].map(
      (label, i) => ({ id: `genre-${i}`, label, options: [] }),
    );
  if (id === "backlog")
    return enrollment.backlogIds.map((bookId, i) => ({
      id: `backlog-${i}`,
      label: `Lettura ${i + 1}`,
      options: [],
      fixedBookId: bookId,
    }));
  const family = id === "birth-year" ? enrollment.family : (id as AwardFamily);
  const rows = AWARD_DATA[family].filter(
    (row) => row.year >= enrollment.fromYear && row.year <= enrollment.toYear,
  );
  if (id === "birth-year") {
    return [...new Set(rows.map((row) => row.year))]
      .sort((a, b) => a - b)
      .map((year) => ({
        id: `year-${year}`,
        label: String(year),
        options: rows.filter((row) => row.year === year),
      }));
  }
  return rows.map((row) => ({ id: row.id, label: String(row.year), options: [row] }));
}
export function eligibleReading(item: LibraryItem, enrollment: ChallengeEnrollment): boolean {
  if (item.status !== "read") return false;
  const finished = item.finished_at ? Date.parse(item.finished_at) : NaN;
  if (
    !enrollment.includePast &&
    (!Number.isFinite(finished) ||
      item.finished_at!.slice(0, 10) < enrollment.joinedAt.slice(0, 10))
  )
    return false;
  if (
    enrollment.deadline &&
    (!Number.isFinite(finished) || item.finished_at!.slice(0, 10) > enrollment.deadline)
  )
    return false;
  return true;
}
function matchesAward(item: LibraryItem, winner: AwardWinner): boolean {
  const book = item.books;
  if (!book || !book.authors.some((author) => authorKey(author) === authorKey(winner.author)))
    return false;
  return !winner.title || key(book.title) === key(winner.title);
}
export function challengeProgress(enrollment: ChallengeEnrollment, library: LibraryItem[]) {
  const eligible = library.filter((item) => eligibleReading(item, enrollment));
  const used = new Set<string>(),
    countries = new Set<string>(),
    works = new Set<string>();
  const slots = challengeSlots(enrollment).map((slot) => {
    const manual = enrollment.assignments[slot.id];
    const assigned = slot.fixedBookId
      ? eligible.find((item) => item.book_id === slot.fixedBookId)
      : manual
        ? eligible.find((item) => item.book_id === manual.bookId)
        : undefined;
    const options = assigned
      ? [assigned]
      : manual
        ? []
        : eligible.filter((item) => slot.options.some((winner) => matchesAward(item, winner)));
    let completed: LibraryItem | undefined;
    for (const candidate of options) {
      if (used.has(candidate.book_id)) continue;
      const work =
        key(candidate.books?.title ?? "") +
        "|" +
        (candidate.books?.authors ?? []).map(authorKey).sort().join("|");
      if (works.has(work)) continue;
      if (enrollment.id === "countries") {
        const country = key(manual?.country ?? "");
        if (!country || countries.has(country)) continue;
        countries.add(country);
      }
      used.add(candidate.book_id);
      works.add(work);
      completed = candidate;
      break;
    }
    return { ...slot, completed, assignment: manual };
  });
  const done = slots.filter((slot) => slot.completed).length;
  return { slots, done, total: slots.length, complete: slots.length > 0 && done === slots.length };
}
export function validateEnrollment(
  value: ChallengeEnrollment,
  library: LibraryItem[],
): string | null {
  if (!CHALLENGE_CATALOGUE.some((c) => c.id === value.id)) return "Sfida non riconosciuta.";
  if (!Number.isFinite(Date.parse(value.joinedAt))) return "Data di iscrizione non valida.";
  if (
    value.deadline &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(value.deadline) || value.deadline < value.joinedAt.slice(0, 10))
  )
    return "La scadenza deve essere successiva all’iscrizione.";
  if (
    !Number.isInteger(value.fromYear) ||
    !Number.isInteger(value.toYear) ||
    value.fromYear > value.toYear
  )
    return "Controlla l’intervallo degli anni.";
  if (value.id === "backlog") {
    if (![5, 10, 20].includes(value.target) || new Set(value.backlogIds).size !== value.target)
      return `Scegli esattamente ${value.target} libri dalla lista Da leggere.`;
    const selected = library.filter((item) => value.backlogIds.includes(item.book_id));
    const workKeys = selected.map(
      (item) =>
        key(item.books?.title ?? "") +
        "|" +
        (item.books?.authors ?? []).map(authorKey).sort().join("|"),
    );
    if (new Set(workKeys).size !== workKeys.length)
      return "Scegli opere diverse: due edizioni dello stesso libro contano una volta sola.";
    if (
      value.backlogIds.some(
        (id) => !library.some((item) => item.book_id === id && item.status === "to_read"),
      )
    )
      return "La selezione deve contenere libri attualmente Da leggere.";
  }
  if (!challengeSlots(value).length) return "Nessuna tappa disponibile per questi anni.";
  return null;
}

/** Discard malformed account preferences before rendering or updating them. */
export function decodeEnrollments(raw: unknown): ChallengeEnrollment[] {
  if (!Array.isArray(raw)) return [];
  const found = new Map<ChallengeId, ChallengeEnrollment>();
  for (const value of raw) {
    if (!value || typeof value !== "object") continue;
    const e = value as Partial<ChallengeEnrollment>;
    if (
      !CHALLENGE_CATALOGUE.some((c) => c.id === e.id) ||
      typeof e.joinedAt !== "string" ||
      !Number.isFinite(Date.parse(e.joinedAt)) ||
      typeof e.includePast !== "boolean" ||
      !(e.family && Object.hasOwn(AWARD_DATA, e.family)) ||
      !Number.isInteger(e.fromYear) ||
      !Number.isInteger(e.toYear) ||
      !Number.isInteger(e.target)
    )
      continue;
    if (
      e.deadline !== null &&
      (typeof e.deadline !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(e.deadline))
    )
      continue;
    if (
      !Array.isArray(e.backlogIds) ||
      !e.backlogIds.every((id) => typeof id === "string") ||
      !e.assignments ||
      typeof e.assignments !== "object" ||
      Array.isArray(e.assignments)
    )
      continue;
    const assignments = Object.fromEntries(
      Object.entries(e.assignments).filter(
        ([, a]) =>
          a &&
          typeof a.bookId === "string" &&
          (a.country === undefined ||
            (typeof a.country === "string" &&
              READING_COUNTRY_CODES.includes(a.country.toUpperCase()))),
      ),
    );
    found.set(e.id!, { ...e, assignments } as ChallengeEnrollment);
  }
  return [...found.values()];
}
export const READING_COUNTRY_CODES =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  );
const regionNames = new Intl.DisplayNames(["it"], { type: "region" });
export function countryName(code: string) {
  try {
    return regionNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}
