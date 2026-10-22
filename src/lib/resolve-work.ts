import {
  directWorkIdentity,
  lookupTitle,
  textKey,
  sameAuthorName,
  workTitle,
  type WorkBook,
  type WorkIdentity,
} from "./work-identity.ts";
export type WorkSearchDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  isbn?: string[];
  editions?: { docs?: { title?: string }[] };
};
const unknown = (): WorkIdentity => ({ workIds: [], titles: [], verified: false });
function isbn13(value: string) {
  const n = value.replace(/[^\dXx]/g, "");
  if (/^\d{13}$/.test(n)) return n;
  if (!/^\d{9}[\dXx]$/.test(n)) return "";
  const base = "978" + n.slice(0, 9);
  const sum = [...base].reduce((total, c, i) => total + Number(c) * (i % 2 ? 3 : 1), 0);
  return base + ((10 - (sum % 10)) % 10);
}
export function matchWorkDocuments(
  book: WorkBook,
  docs: WorkSearchDoc[],
  exactIsbn = false,
): WorkIdentity {
  const isbns = new Set((book.isbns ?? []).map(isbn13).filter(Boolean));
  const matches = docs.filter((doc) => {
    if (!/^(?:\/works\/)?OL\d+W$/.test(doc.key ?? "")) return false;
    if (exactIsbn && doc.isbn?.some((i) => isbns.has(isbn13(i)))) return true;
    const sameAuthor = doc.author_name?.some((a) => book.authors.some((b) => sameAuthorName(a, b)));
    return (
      sameAuthor &&
      [doc.title, ...(doc.editions?.docs?.map((e) => e.title) ?? [])].some(
        (title) => !!title && workTitle(title) === workTitle(book.title),
      )
    );
  });
  // Never promote an ambiguous title lookup into a trusted work association.
  if (matches.length !== 1) return unknown();
  const match = matches[0]!;
  return {
    workIds: [match.key!.replace("/works/", "")],
    titles: [
      ...new Set(
        [
          book.title,
          match.title ?? "",
          ...(match.editions?.docs?.map((e) => e.title ?? "") ?? []),
        ].filter(Boolean),
      ),
    ],
    verified: true,
  };
}
export async function resolveWork(
  book: WorkBook,
  fetcher: typeof fetch = fetch,
): Promise<WorkIdentity> {
  const direct = directWorkIdentity(book);
  if (direct) return direct;
  const isbns = [
    ...new Set(
      [...(book.isbns ?? []), ...(book.id.startsWith("csv:isbn:") ? [book.id.slice(9)] : [])]
        .map(isbn13)
        .filter(Boolean),
    ),
  ];
  if (!book.title.trim() && !isbns.length) return unknown();
  const params = new URLSearchParams({
    fields: "key,title,author_name,isbn,editions,editions.title",
    limit: "5",
  });
  if (isbns.length) params.set("q", `isbn:(${isbns.slice(0, 3).join(" OR ")})`);
  else {
    if (!book.authors.length) return unknown();
    const title = lookupTitle(book.title).replace(/["\\]/g, " ");
    const surname = textKey(book.authors[0]!.split(",")[0]!).split(" ").at(-1);
    params.set("q", `"${title}" author:${surname}`);
  }
  const response = await fetcher(`https://openlibrary.org/search.json?${params}`, {
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw Error("Identità del libro temporaneamente non disponibile");
  const json = (await response.json()) as { docs?: WorkSearchDoc[] };
  return matchWorkDocuments({ ...book, isbns }, json.docs ?? [], isbns.length > 0);
}
