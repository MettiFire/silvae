import { authorNameKey } from "./followed-authors.ts";
import { descriptionText } from "./book-metadata.ts";
import type { Book } from "./books";
export type AuthorCandidate = {
  id: string;
  name: string;
  birth: string | null;
  topWork: string | null;
  workCount: number;
};
export type AuthorDetails = {
  id: string;
  name: string;
  bio: string | null;
  birth: string | null;
  death: string | null;
  photo: string | null;
  source: string;
};
const OL = "https://openlibrary.org";
async function get(path: string) {
  const r = await fetch(`${OL}${path}`, { signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error("Il catalogo autori non è disponibile. Riprova.");
  return r.json();
}
export async function findAuthors(name: string): Promise<AuthorCandidate[]> {
  const d = await get(`/search/authors.json?${new URLSearchParams({ q: name, limit: "12" })}`);
  return (d.docs ?? [])
    .filter((a: any) => /^OL\d+A$/.test(a.key))
    .map((a: any) => ({
      id: a.key,
      name: a.name,
      birth: a.birth_date ?? null,
      topWork: a.top_work ?? null,
      workCount: a.work_count ?? 0,
    }))
    .sort(
      (a: AuthorCandidate, b: AuthorCandidate) =>
        Number(authorNameKey(b.name) === authorNameKey(name)) -
        Number(authorNameKey(a.name) === authorNameKey(name)),
    );
}
export function defaultAuthor(candidates: AuthorCandidate[], name: string): string | null {
  const exact = candidates.filter((a) => authorNameKey(a.name) === authorNameKey(name));
  return exact.length === 1 ? exact[0]!.id : null;
}
export async function getAuthor(id: string): Promise<AuthorDetails> {
  if (!/^OL\d+A$/.test(id)) throw new Error("Autore non valido.");
  const a = await get(`/authors/${id}.json`);
  return {
    id,
    name: a.name,
    bio: descriptionText(typeof a.bio === "string" ? a.bio : a.bio?.value) || null,
    birth: a.birth_date ?? null,
    death: a.death_date ?? null,
    photo: a.photos?.find((n: number) => n > 0)
      ? `https://covers.openlibrary.org/a/id/${a.photos.find((n: number) => n > 0)}-M.jpg?default=false`
      : null,
    source: `${OL}/authors/${id}`,
  };
}
export async function getAuthorBooks(
  id: string,
  page: number,
  sort: "new" | "title" | "popular",
): Promise<{ books: Book[]; total: number }> {
  if (!/^OL\d+A$/.test(id)) throw new Error("Autore non valido.");
  const params = new URLSearchParams({
    q: `author_key:${id}`,
    limit: "24",
    offset: String(Math.max(0, page) * 24),
    sort: sort === "popular" ? "readinglog" : sort,
    fields:
      "key,title,author_name,first_publish_year,number_of_pages_median,subject,cover_i,isbn,readinglog_count",
  });
  const data = await get(`/search.json?${params}`);
  return {
    total: data.numFound ?? data.num_found ?? 0,
    books: (data.docs ?? []).map((d: any) => ({
      id: `ol:${d.key.split("/").pop()}`,
      title: d.title,
      authors: d.author_name ?? [],
      cover_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
      published_year: d.first_publish_year ?? null,
      page_count: d.number_of_pages_median ?? null,
      categories: (d.subject ?? []).slice(0, 6),
      description: null,
      isbns: d.isbn ?? [],
      reading_count: d.readinglog_count ?? null,
    })),
  };
}
