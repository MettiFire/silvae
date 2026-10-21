import { parseBookLanguage } from "./book-language.ts";
import type { Book } from "./books";
import type { LibraryItem } from "./library";
import { sameBook } from "./book-metadata.ts";

export const PREFERENCES_FIELD = "reading_preferences_v1";
export const READING_GENRES = [
  {
    id: "fiction",
    label: "Romanzi e narrativa",
    subject: "Fiction",
    aliases: ["fiction", "novels", "romanzo", "romanzi", "narrativa"],
  },
  {
    id: "nonfiction",
    label: "Saggistica e saggi",
    subject: "Nonfiction",
    aliases: ["nonfiction", "non fiction", "saggistica", "essays", "saggi"],
  },
  {
    id: "society",
    label: "Attualità e società",
    subject: "Social Science",
    aliases: [
      "social science",
      "sociology",
      "political science",
      "sociologia",
      "societa",
      "attualita",
    ],
  },
  {
    id: "arts",
    label: "Arte e cultura",
    subject: "Art",
    aliases: ["art", "arts", "arte", "cultura"],
  },
  { id: "fantasy", label: "Fantasy", subject: "Fantasy", aliases: ["fantasy"] },
  { id: "romance", label: "Romance", subject: "Romance", aliases: ["romance", "romanzi rosa"] },
  {
    id: "mystery",
    label: "Gialli e thriller",
    subject: "Mystery",
    aliases: ["mystery", "thriller", "detective", "gialli"],
  },
  {
    id: "scifi",
    label: "Fantascienza",
    subject: "Science Fiction",
    aliases: ["science fiction", "fantascienza"],
  },
  {
    id: "historical",
    label: "Romanzi storici",
    subject: "Historical Fiction",
    aliases: ["historical fiction", "historical", "storici"],
  },
  {
    id: "literary",
    label: "Narrativa contemporanea",
    subject: "Literary Fiction",
    aliases: ["literary", "contemporary", "contemporanea"],
  },
  { id: "classics", label: "Classici", subject: "Classics", aliases: ["classics", "classici"] },
  { id: "horror", label: "Horror", subject: "Horror", aliases: ["horror"] },
  {
    id: "youngadult",
    label: "Young adult",
    subject: "Young Adult",
    aliases: ["young adult", "juvenile fiction"],
  },
  {
    id: "biography",
    label: "Biografie e memoir",
    subject: "Biography",
    aliases: ["biography", "autobiography", "memoir", "biografie"],
  },
  { id: "history", label: "Storia", subject: "History", aliases: ["history", "storia"] },
  {
    id: "science",
    label: "Scienza e natura",
    subject: "Science",
    aliases: ["science", "nature", "scienza"],
  },
  {
    id: "psychology",
    label: "Psicologia",
    subject: "Psychology",
    aliases: ["psychology", "psicologia"],
  },
  {
    id: "philosophy",
    label: "Filosofia",
    subject: "Philosophy",
    aliases: ["philosophy", "filosofia"],
  },
  { id: "poetry", label: "Poesia", subject: "Poetry", aliases: ["poetry", "poesia"] },
  {
    id: "comics",
    label: "Fumetti e graphic novel",
    subject: "Comics & Graphic Novels",
    aliases: ["comics", "graphic novel", "manga", "fumetti"],
  },
] as const;
export type ReadingPreferences = {
  version: 1;
  language: string;
  status: "completed" | "skipped";
  liked: string[];
  avoided: string[];
  length: "any" | "short" | "medium" | "long";
};
export const emptyPreferences = (): ReadingPreferences => ({
  version: 1,
  language: "auto",
  status: "skipped",
  liked: [],
  avoided: [],
  length: "any",
});
export function parsePreferences(raw: unknown): ReadingPreferences | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r["version"] !== 1 || !["completed", "skipped"].includes(String(r["status"]))) return null;
  const ids = new Set<string>(READING_GENRES.map((g) => g.id));
  const list = (v: unknown) =>
    Array.isArray(v)
      ? [...new Set(v.filter((s): s is string => typeof s === "string" && ids.has(s)))].slice(0, 5)
      : [];
  const liked = list(r["liked"]);
  if (r["status"] === "completed" && !liked.length) return null;
  return {
    version: 1,
    language: parseBookLanguage(r["language"]),
    status: r["status"] as ReadingPreferences["status"],
    liked,
    avoided: list(r["avoided"]).filter((id) => !liked.includes(id)),
    length: ["short", "medium", "long"].includes(String(r["length"]))
      ? (r["length"] as ReadingPreferences["length"])
      : "any",
  };
}
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
function matches(book: Book, id: string) {
  const genre = READING_GENRES.find((g) => g.id === id);
  return (
    !!genre &&
    book.categories.some((c) =>
      genre.aliases.some((a) =>
        ` ${norm(id === "science" ? c.replace(/science fiction/gi, "") : id === "fiction" ? c.replace(/non[ -]?fiction/gi, "") : c)} `.includes(
          ` ${norm(a)} `,
        ),
      ),
    )
  );
}
/** Unread shelves express interest, not an endorsement equivalent to a high rating. */
export function libraryInterest(item: LibraryItem): number {
  if (item.rating != null && Number(item.rating) <= 2) return -2;
  const status =
    item.status === "read"
      ? 1
      : item.status === "reading"
        ? 0.8
        : item.status === "to_read"
          ? 0.4
          : 0;
  return status + (item.favorite ? 3 : 0) + (Number(item.rating ?? 0) >= 4 ? 2 : 0);
}
export function recommendationPlan(preferences: ReadingPreferences | null, library: LibraryItem[]) {
  const weights = new Map<string, number>();
  for (const id of preferences?.liked ?? []) weights.set(id, 5);
  for (const item of library) {
    if (!item.books) continue;
    const weight = libraryInterest(item);
    if (!weight) continue;
    for (const g of READING_GENRES)
      if (matches(item.books, g.id)) weights.set(g.id, (weights.get(g.id) ?? 0) + weight);
  }
  const avoided = new Set(preferences?.avoided ?? []);
  const top = [...weights]
    .filter(([id, w]) => w > 0 && !avoided.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);
  // No community history is needed: start with several distinct catalogue subjects.
  const ids = top.length
    ? top
    : [
        ...new Set([
          "literary",
          "fantasy",
          "mystery",
          "biography",
          "science",
          ...READING_GENRES.map((g) => g.id),
        ]),
      ]
        .filter((id) => !avoided.has(id))
        .slice(0, 5);
  return ids.map((id) => READING_GENRES.find((g) => g.id === id)!);
}
export type RecommendationCandidate = { book: Book; genreId: string };
export function recommendationSources(
  preferences: ReadingPreferences | null,
  library: LibraryItem[],
) {
  const authors = new Map<string, { name: string; weight: number }>();
  for (const item of library) {
    const weight = libraryInterest(item);
    for (const name of item.books?.authors ?? []) {
      if (!name.trim()) continue;
      const key = norm(name);
      const existing = authors.get(key);
      authors.set(key, { name, weight: (existing?.weight ?? 0) + weight });
    }
  }
  const selected = [...authors.values()]
    .filter((a) => a.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2);
  return [
    ...recommendationPlan(preferences, library)
      .slice(0, 5 - selected.length)
      .map((g) => ({
        id: g.id,
        genreId: g.id,
        query: `subject:"${g.subject}"`,
        author: null as string | null,
      })),
    ...selected.map((a) => ({
      id: `author:${norm(a.name)}`,
      genreId: `author:${norm(a.name)}`,
      query: `inauthor:"${a.name.replace(/["\n\r]/g, " ")}"`,
      author: a.name,
    })),
  ];
}
function rotationVariation(id: string, rotation: number) {
  if (!rotation) return 0;
  let hash = rotation >>> 0;
  for (const c of id) hash = (Math.imul(hash, 31) + c.charCodeAt(0)) >>> 0;
  return ((hash % 1000) / 1000) * 0.75;
}
export function rankRecommendations(
  candidates: RecommendationCandidate[],
  preferences: ReadingPreferences | null,
  library: LibraryItem[],
  dismissed: string[],
  limit = 12,
  rotation = 0,
) {
  const owned = new Set(library.map((i) => i.book_id));
  const hidden = new Set(dismissed);
  const avoided = preferences?.avoided ?? [];
  const items: { book: Book; reason: string; score: number; genreId: string }[] = [];
  for (const { book, genreId } of candidates) {
    // Broad provider subjects can return science fiction for a science query.
    if (
      genreId === "science" &&
      (matches(book, "scifi") ||
        book.categories.some((c) => /\bfiction\b/i.test(c) && !/\bnon[ -]?fiction\b/i.test(c)))
    )
      continue;
    if (
      owned.has(book.id) ||
      hidden.has(book.id) ||
      library.some((i) => i.books && sameBook(i.books, book))
    )
      continue;
    if (avoided.includes(genreId) || avoided.some((id) => matches(book, id))) continue;
    if (items.some((i) => i.book.id === book.id || sameBook(i.book, book))) continue;
    const genre = READING_GENRES.find((g) => g.id === genreId);
    const liked = preferences?.liked.includes(genreId);
    let score = (liked ? 5 : 1) + rotationVariation(book.id, rotation);
    let reason = liked
      ? `Ti piace: ${genre?.label}`
      : `Esplora: ${genre?.label ?? "nuove letture"}`;
    for (const item of library) {
      if (!item.books) continue;
      const sameAuthor = book.authors.some((a) =>
        item.books!.authors.some((b) => norm(a) === norm(b)),
      );
      const sameGenre = matches(item.books, genreId);
      const low = item.rating != null && Number(item.rating) <= 2;
      if (low && (sameGenre || sameAuthor)) score -= sameAuthor ? 3 : 0.5;
      else if (libraryInterest(item) > 0 && (sameAuthor || sameGenre)) {
        const strong = item.favorite || Number(item.rating ?? 0) >= 4;
        score += sameAuthor
          ? strong
            ? 4
            : libraryInterest(item)
          : strong
            ? 0.75
            : libraryInterest(item) * 0.35;
        if (sameAuthor) {
          const author = book.authors.find((a) =>
            item.books!.authors.some((b) => norm(a) === norm(b)),
          );
          reason = strong
            ? `Un autore che hai apprezzato: ${author}`
            : item.status === "to_read"
              ? `Dagli autori che vuoi leggere: ${author}`
              : `Un autore nella tua libreria: ${author}`;
        } else if (!liked)
          reason =
            item.status === "to_read"
              ? `Dai libri che vuoi leggere: ${genre?.label ?? "generi affini"}`
              : `Dalla tua libreria: ${genre?.label ?? "generi affini"}`;
      }
    }
    const length = preferences?.length;
    if (book.page_count && length && length !== "any") {
      const fit =
        length === "short"
          ? book.page_count < 250
          : length === "medium"
            ? book.page_count >= 250 && book.page_count <= 450
            : book.page_count > 450;
      score += fit ? 1.5 : -0.5;
    }
    items.push({ book, reason, score, genreId });
  }
  const result: typeof items = [];
  // Greedy diversity penalty prevents the first queried genre/author filling the feed.
  while (items.length && result.length < limit) {
    const adjusted = (item: (typeof items)[number]) =>
      item.score -
      result.filter((i) => i.genreId === item.genreId).length * 1.5 -
      result.filter((i) =>
        i.book.authors.some((a) => item.book.authors.some((b) => norm(a) === norm(b))),
      ).length *
        2;
    items.sort((a, b) => adjusted(b) - adjusted(a));
    result.push(items.shift()!);
  }
  return result;
}
