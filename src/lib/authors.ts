import { localizedWorkTitles, needsLocalizedTitle } from "./work-titles.ts";
import { authorCountryKey } from "./author-country-key.ts";
import {
  authorAliases,
  authorDisplayName,
  authorMatchesQuery,
  groupAuthors,
} from "./author-search.ts";
import { applyBookLanguage } from "./book-language.ts";
import { descriptionText } from "./book-metadata.ts";
import type { Book } from "./books";
export type AuthorCandidate = {
  id: string;
  name: string;
  birth: string | null;
  topWork: string | null;
  workCount: number;
  death?: string | null;
  alternateNames?: string[];
  ids?: string[];
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
type AuthorDoc = {
  key: string;
  name: string;
  alternate_names?: string[];
  birth_date?: string;
  death_date?: string;
  top_work?: string;
  work_count?: number;
};
type AuthorBookDoc = {
  key: string;
  title: string;
  author_name?: string[];
  author_key?: string[];
  cover_i?: number;
  first_publish_year?: number;
  number_of_pages_median?: number;
  subject?: string[];
  isbn?: string[];
  readinglog_count?: number;
  editions?: { docs?: { title?: string; cover_i?: number; isbn?: string[] }[] };
};
const OL = "https://openlibrary.org";
async function get(path: string, signal?: AbortSignal) {
  const r = await fetch(`${OL}${path}`, {
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(12000)])
      : AbortSignal.timeout(12000),
  });
  if (!r.ok) throw new Error("Il catalogo autori non è disponibile. Riprova.");
  return r.json();
}
export async function findAuthors(
  name: string,
  language?: string,
  signal?: AbortSignal,
): Promise<AuthorCandidate[]> {
  const d = await get(
    `/search/authors.json?${new URLSearchParams({ q: name, limit: "20" })}`,
    signal,
  );
  return (d.docs ?? [])
    .filter((a: AuthorDoc) => /^OL\d+A$/.test(a.key))
    .map((a: AuthorDoc) => ({
      id: a.key,
      name: authorDisplayName([a.name, ...(a.alternate_names ?? [])], name, language),
      alternateNames: [a.name, ...(a.alternate_names ?? [])],
      death: a.death_date ?? null,
      birth: a.birth_date ?? null,
      topWork: a.top_work ?? null,
      workCount: a.work_count ?? 0,
    }))
    .sort(
      (a: AuthorCandidate, b: AuthorCandidate) =>
        Number(authorCountryKey(b.name) === authorCountryKey(name)) -
        Number(authorCountryKey(a.name) === authorCountryKey(name)),
    );
}
export function defaultAuthor(candidates: AuthorCandidate[], name: string): string | null {
  const groups = groupAuthors(candidates);
  const exact = groups.filter((author) =>
    authorAliases(author).some((alias) => authorCountryKey(alias) === authorCountryKey(name)),
  );
  const relevant = exact.length
    ? exact
    : groups.filter((author) => authorMatchesQuery(author, name));
  return relevant.length === 1 ? relevant[0]!.id : null;
}
export async function getAuthor(
  id: string,
  preferredName?: string,
  language?: string,
): Promise<AuthorDetails> {
  if (!/^OL\d+A$/.test(id)) throw new Error("Autore non valido.");
  const a = await get(`/authors/${id}.json`);
  return {
    id,
    name: authorDisplayName([a.name, ...(a.alternate_names ?? [])], preferredName, language),
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
  options: {
    language?: string | undefined;
    displayName?: string | undefined;
    authorIds?: string[] | undefined;
  } = {},
): Promise<{ books: Book[]; total: number }> {
  if (!/^OL\d+A$/.test(id)) throw new Error("Autore non valido.");
  const ids = [
    ...new Set([id, ...(options.authorIds ?? []).filter((key) => /^OL\d+A$/.test(key))]),
  ].slice(0, 8);
  const params = new URLSearchParams({
    q: ids.length === 1 ? `author_key:${id}` : `author_key:(${ids.join(" OR ")})`,
    limit: "24",
    offset: String(Math.max(0, page) * 24),
    sort: sort === "popular" ? "readinglog" : sort,
    fields:
      "key,title,author_name,first_publish_year,number_of_pages_median,subject,cover_i,isbn,readinglog_count,author_key,editions,editions.title,editions.cover_i,editions.isbn",
  });
  applyBookLanguage(params, "openlibrary", options.language);
  if (!options.language) params.set("lang", "en");
  const data = await get(`/search.json?${params}`);
  const translations = await localizedWorkTitles(
    (data.docs ?? [])
      .filter((d: AuthorBookDoc) => needsLocalizedTitle(d.title, options.language))
      .map((d: AuthorBookDoc) => d.key.split("/").pop()!),
    options.language,
  );
  return {
    total: data.numFound ?? data.num_found ?? 0,
    books: (data.docs ?? []).map((d: AuthorBookDoc) => {
      const edition = d.editions?.docs?.[0];
      const cover = edition?.cover_i ?? d.cover_i;
      const authors = (d.author_name ?? []).map((name: string, index: number) =>
        options.displayName &&
        ((d.author_key ?? [])[index] === id ||
          ids.includes((d.author_key ?? [])[index] ?? "") ||
          d.author_name?.length === 1)
          ? options.displayName
          : name,
      );
      return {
        id: `ol:${d.key.split("/").pop()}`,
        title: translations.get(d.key.split("/").pop()!) ?? edition?.title ?? d.title,
        authors: [...new Set(authors)] as string[],
        cover_url: cover ? `https://covers.openlibrary.org/b/id/${cover}-L.jpg` : null,
        published_year: d.first_publish_year ?? null,
        page_count: d.number_of_pages_median ?? null,
        categories: (d.subject ?? []).slice(0, 6),
        description: null,
        isbns: edition?.isbn ?? d.isbn ?? [],
        reading_count: d.readinglog_count ?? null,
      };
    }),
  };
}
