export type WorkBook = { id: string; title: string; authors: string[]; isbns?: string[] };
export type WorkIdentity = { workIds: string[]; titles: string[]; verified: boolean };
export type WorkIdentities = Record<string, WorkIdentity>;
export const textKey = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/** Strip publishing labels, never arbitrary subtitles, series titles or volume numbers. */
export function lookupTitle(value: string): string {
  const edition =
    "(?:(?:nuova|new|revised|illustrated|illustrata|illustrato|special|speciale|deluxe|anniversary|anniversario|anniversary edition|revised edition)\\s+)*(?:edizione|edition|paperback|hardback|hardcover|ebook|e-book|kindle|audiobook|audiolibro|brossura|copertina rigida|english edition|italian edition|edizione italiana|edizione inglese)";
  return value
    .replace(/[’‘]/g, "'")
    .replace(/\.\s*(?:il signore degli anelli|the lord of the rings)(?:\s*\([^)]*\))?\s*$/i, "")
    .replace(new RegExp(`\\s*[([]\\s*${edition}\\b[^)\\]]*[)\\]]\\s*`, "gi"), " ")
    .replace(new RegExp(`\\s*(?::|[-–—])\\s*${edition}\\b.*$`, "i"), "")
    .replace(/\s*\((?:\d+(?:st|nd|rd|th)?\s+)?(?:anniversary|edizione|edition)[^)]*\)\s*$/i, "")
    .trim();
}
export function workTitle(value: string): string {
  return textKey(lookupTitle(value));
}
function authorParts(value: string) {
  const reordered = value.includes(",") ? value.split(",").reverse().join(" ") : value;
  const parts = textKey(reordered).split(" ").filter(Boolean);
  return {
    surname: parts.at(-1) ?? "",
    initials: parts
      .slice(0, -1)
      .map((p) => p[0])
      .join(""),
  };
}
export function sameAuthorName(a: string, b: string): boolean {
  if (!a.trim() || !b.trim()) return false;
  if (textKey(a).replaceAll(" ", "") === textKey(b).replaceAll(" ", "")) return true;
  const x = authorParts(a),
    y = authorParts(b);
  return (
    !!x.surname &&
    x.surname === y.surname &&
    (!x.initials ||
      !y.initials ||
      x.initials.startsWith(y.initials) ||
      y.initials.startsWith(x.initials))
  );
}
export function sharedAuthor(a: Pick<WorkBook, "authors">, b: Pick<WorkBook, "authors">): boolean {
  return a.authors.some((x) => b.authors.some((y) => sameAuthorName(x, y)));
}
export function directWorkIdentity(book: WorkBook): WorkIdentity | undefined {
  const key = book.id.match(/^(?:ol:|\/works\/)(OL\d+W)$/)?.[1];
  return key ? { workIds: [key], titles: [book.title], verified: true } : undefined;
}
function identity(book: WorkBook, identities: WorkIdentities) {
  return identities[book.id] ?? directWorkIdentity(book);
}
export function sameReadingWork(
  a: WorkBook,
  b: WorkBook,
  identities: WorkIdentities = {},
): boolean {
  if (a.id === b.id) return true;
  const x = identity(a, identities),
    y = identity(b, identities);
  if (x?.verified && y?.verified && x.workIds.some((id) => y.workIds.includes(id))) return true;
  if (!sharedAuthor(a, b)) return false;
  const titlesA = [a.title, ...(x?.verified ? x.titles : [])].map(workTitle).filter(Boolean);
  const titlesB = [b.title, ...(y?.verified ? y.titles : [])].map(workTitle).filter(Boolean);
  return titlesA.some((title) => titlesB.includes(title));
}
export function canRecommendWork(
  book: WorkBook,
  excluded: WorkBook[],
  identities: WorkIdentities = {},
): boolean {
  for (const other of excluded) {
    if (sameReadingWork(book, other, identities)) return false;
    // Until both works are verified, a translated edition by the same author
    // cannot safely be distinguished from an unread work. Do not show it first.
    if (
      sharedAuthor(book, other) &&
      (!identity(book, identities)?.verified || !identity(other, identities)?.verified)
    )
      return false;
  }
  return true;
}
export function uniqueRecommendationWorks(
  books: WorkBook[],
  identities: WorkIdentities = {},
): WorkBook[] {
  const result: WorkBook[] = [];
  for (const book of books)
    if (!result.some((other) => sameReadingWork(book, other, identities))) result.push(book);
  return result;
}
