import type { Book } from "./books";
import { READING_GENRES } from "./reading-preferences.ts";
import { sameReadingWork, sharedAuthor, textKey, type WorkIdentities } from "./work-identity.ts";

export type RelatedSource = { query: string; genreId?: string; author?: string };
export type RelatedCandidate = { book: Book; source: RelatedSource };
function genresFor(book: Book) {
  const categories = book.categories.map(textKey);
  return READING_GENRES.filter((genre) =>
    categories.some((category) =>
      genre.aliases.some((alias) => {
        if (genre.id === "fiction" && /non ?fiction/.test(category)) return false;
        if (genre.id === "science" && /science fiction/.test(category)) return false;
        // "Historical Chronology" or "History" describe essays, not historical novels.
        if (genre.id === "historical" && !/fiction|novel|romanz|narrativa/.test(category))
          return false;
        return ` ${category} `.includes(` ${textKey(alias)} `);
      }),
    ),
  ).sort(
    (a, b) =>
      Number(["fiction", "nonfiction"].includes(a.id)) -
      Number(["fiction", "nonfiction"].includes(b.id)),
  );
}

/** A few focused sources instead of unrelated popular titles. */
export function relatedBookSources(book: Book): RelatedSource[] {
  const sources: RelatedSource[] = [];
  const author = book.authors[0]?.replaceAll('"', "").trim();
  if (author) sources.push({ query: `inauthor:"${author}"`, author });
  const genres = genresFor(book);
  const specific = genres.filter((genre) => !["fiction", "nonfiction"].includes(genre.id));
  for (const genre of specific.slice(0, 2))
    sources.push({ query: `subject:"${genre.subject}"`, genreId: genre.id });
  return sources;
}

/** Fiction vs essays: a history essay must not suggest Austen or Wilde. */
export function bookKind(book: Pick<Book, "categories">): "fiction" | "nonfiction" | null {
  const text = ` ${book.categories.map(textKey).join(" | ")} `;
  const fiction = /\b(?:fiction|novels?|romanz[oi]|narrativa|fantasy|romance|thriller|mystery|manga|comics)\b/.test(
    text.replace(/non ?fiction/g, ""),
  );
  const essay =
    /\b(?:non ?fiction|history|historia|storia|science|social science|philosophy|filosofia|biography|biografia|saggistica|saggi|essays|civilization|economics|psychology|politics|human beings)\b/.test(
      text.replace(/(?:science|historical) fiction/g, ""),
    );
  if (/\bnon ?fiction\b/.test(text) && !fiction) return "nonfiction";
  if (fiction) return "fiction";
  return essay ? "nonfiction" : null;
}

export function rankRelatedBooks(
  current: Book,
  candidates: RelatedCandidate[],
  identities: WorkIdentities = {},
  avoided: string[] = [],
  limit = 6,
) {
  const currentGenres = new Set(genresFor(current).map((genre) => genre.id));
  const pool: { book: Book; reason: string; score: number }[] = [];
  for (const { book, source } of candidates) {
    if (sameReadingWork(current, book, identities)) continue;
    const genres = genresFor(book);
    if (
      avoided.includes(source.genreId ?? "") ||
      genres.some((genre) => avoided.includes(genre.id))
    )
      continue;
    const sameAuthor = sharedAuthor(current, book);
    const kind = bookKind(current);
    const candidateKind = bookKind(book);
    if (!sameAuthor && kind && candidateKind && kind !== candidateKind) continue;
    const overlap = genres.filter((genre) => currentGenres.has(genre.id));
    const sourceGenre = READING_GENRES.find(
      (genre) => genre.id === source.genreId && currentGenres.has(genre.id),
    );
    if (!sameAuthor && !overlap.length && !sourceGenre) continue;
    const genre =
      overlap.find((genre) => !["fiction", "nonfiction"].includes(genre.id)) ??
      sourceGenre ??
      overlap[0];
    const score =
      (sameAuthor ? 4 : 0) +
      (genre ? (["fiction", "nonfiction"].includes(genre.id) ? 1 : 4) : 0) +
      Math.min(1.5, Math.log10(1 + (book.ratings_count ?? 0)) * 0.3) +
      (book.cover_url ? 0.2 : 0);
    const reason = sameAuthor ? "Dello stesso autore" : `Un genere in comune: ${genre!.label}`;
    const duplicate = pool.findIndex((item) => sameReadingWork(item.book, book, identities));
    if (duplicate >= 0) {
      if (score > pool[duplicate]!.score) pool[duplicate] = { book, reason, score };
    } else pool.push({ book, reason, score });
  }
  const result: typeof pool = [];
  while (pool.length && result.length < limit) {
    const adjusted = (item: (typeof pool)[number]) =>
      item.score - result.filter((chosen) => sharedAuthor(chosen.book, item.book)).length * 3;
    pool.sort((a, b) => adjusted(b) - adjusted(a));
    result.push(pool.shift()!);
  }
  return result;
}
