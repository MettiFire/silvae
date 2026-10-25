import { CATALOGUE_SUPPLEMENT, supplementSearch } from "./catalogue-supplement";
import { olCatalogueSearch as serverOlCatalogueSearch } from "./openlibrary.functions";
import { createOpenLibrarySearch } from "./openlibrary-search";
const browserOlSearch = createOpenLibrarySearch();
async function olCatalogueSearch(options: Parameters<typeof serverOlCatalogueSearch>[0]) {
  try {
    return await serverOlCatalogueSearch(options);
  } catch (error) {
    if (typeof window === "undefined" || options.signal?.aborted) throw error;
    return browserOlSearch(options.data.params);
  }
}
import { mangaCovers } from "./manga-client";
import { mangaCatalogue } from "./manga-client";
import { isMangaId, type MangaDetails } from "./manga-model";
import { genreQuery } from "./genre-groups.ts";
import { localizedWorkTitles, needsLocalizedTitle } from "./work-titles.ts";
import {
  bookSuggestions,
  matchesCatalogueCompletion,
  catalogueCompletionQuery,
} from "@/lib/search-suggestions";
import { getAuthor } from "@/lib/authors";
import { BOOK_LANGUAGES } from "./book-language";
import { applyBookLanguage } from "@/lib/book-language";
import { sameBook, coverUrls, descriptionText } from "@/lib/book-metadata";
import { supabase } from "@/integrations/supabase/client";
import { gbSearch, gbVolume, gbCovers } from "@/lib/google-books.functions";

export type Book = {
  author_aliases?: string[] | undefined;
  manga?: MangaDetails;
  content_language?: string | undefined;
  id: string;
  title: string;
  authors: string[];
  cover_url: string | null;
  custom_cover_url?: string | null;
  published_year: number | null;
  page_count: number | null;
  categories: string[];
  description: string | null;
  cover_candidates?: string[];
  isbns?: string[];
  rating_source?: "Google Books" | "Open Library" | undefined;
  average_rating?: number | null;
  ratings_count?: number | null;
  reading_count?: number | null;
};

const OL_API = "https://openlibrary.org";

/**
 * Google Books calls go through server functions so the API key (secret
 * GOOGLE_API_KEY) never reaches the browser. Open Library stays as fallback.
 */

function upgradeCover(url?: string) {
  if (!url) return null;
  // Keep Google's own zoom level: forcing a higher zoom often returns the
  // grey "image not available" placeholder instead of the real cover.
  return url.replace("http://", "https://").replace("&edge=curl", "");
}

type Volume = {
  id: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publishedDate?: string;
    language?: string;
    pageCount?: number;
    categories?: string[];
    description?: string;
    averageRating?: number;
    ratingsCount?: number;
    industryIdentifiers?: { type: string; identifier: string }[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
      large?: string;
      extraLarge?: string;
    };
  };
};

export function mapVolume(v: Volume): Book {
  const i = v.volumeInfo ?? {};
  const year = i.publishedDate ? Number(i.publishedDate.slice(0, 4)) : null;
  return {
    id: v.id,
    content_language: i.language,
    title: i.title ?? "Senza titolo",
    authors: i.authors ?? [],
    cover_url: upgradeCover(
      i.imageLinks?.extraLarge ?? i.imageLinks?.large ?? i.imageLinks?.thumbnail,
    ),
    published_year: Number.isFinite(year) ? year : null,
    page_count: i.pageCount ?? null,
    categories: i.categories ?? [],
    description: descriptionText(i.description) || null,
    isbns: (i.industryIdentifiers ?? [])
      .filter((x) => /ISBN/.test(x.type))
      .map((x) => x.identifier),
    cover_candidates: [i.imageLinks?.thumbnail, i.imageLinks?.smallThumbnail]
      .map(upgradeCover)
      .filter((v): v is string => !!v),
    rating_source: "Google Books",
    average_rating: i.averageRating ?? null,
    ratings_count: i.ratingsCount ?? null,
  };
}

// ---------- Open Library fallback (no key, no daily quota) ----------

type OLDoc = {
  key: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  subject?: string[];
  cover_i?: number;
  isbn?: string[];
  ratings_average?: number;
  ratings_count?: number;
  editions?: { docs?: { title?: string; cover_i?: number; isbn?: string[] }[] };
};

function mapOLDoc(d: OLDoc): Book {
  return {
    id: `ol:${d.key.replace("/works/", "")}`,
    title: d.title ?? "Senza titolo",
    authors: d.author_name ?? [],
    cover_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
    published_year: d.first_publish_year ?? null,
    page_count: d.number_of_pages_median ?? null,
    categories: (d.subject ?? []).slice(0, 4),
    description: null,
    isbns: d.isbn ?? [],
    rating_source: "Open Library",
    average_rating: d.ratings_average ?? null,
    ratings_count: d.ratings_count ?? null,
  };
}

async function olSearch(
  query: string,
  max: number,
  startIndex = 0,
  order: "relevance" | "newest" = "relevance",
  language?: string,
): Promise<Book[]> {
  const params = new URLSearchParams({
    limit: String(max),
    offset: String(startIndex),
    fields:
      "key,title,author_name,first_publish_year,number_of_pages_median,subject,cover_i,isbn,ratings_average,ratings_count",
  });
  if (language)
    params.set(
      "fields",
      params.get("fields") + ",editions,editions.title,editions.cover_i,editions.isbn",
    );
  if (order === "newest") params.set("sort", "new");
  // Preserve ISBN/author/subject semantics rather than turning everything into keywords.
  const isbn = query.match(/^isbn:(.+)$/);
  const author = query.match(/^inauthor:"?([^"\n]+)"?$/);
  const subject = query.match(/^subject:"?([^"\n]+)"?$/);
  if (isbn) params.set("isbn", isbn[1]!.trim());
  else if (author) params.set("author", author[1]!.trim());
  else if (subject) params.set("subject", subject[1]!.trim());
  else params.set("q", query.replace(/intitle:/g, "title:").replace(/inauthor:/g, "author:"));
  applyBookLanguage(params, "openlibrary", language);
  const res = await olCatalogueSearch({ data: { params: Object.fromEntries(params) } });
  if (res.status !== 200) throw new Error("Errore nel recupero dei libri");
  const data = JSON.parse(res.json) as { docs?: OLDoc[] };
  const docs = (data.docs ?? []).map((d) => {
    const edition = language ? d.editions?.docs?.[0] : undefined;
    if (!edition) return d;
    const localized: OLDoc = { ...d };
    if (edition.title) localized.title = edition.title;
    if (edition.cover_i) localized.cover_i = edition.cover_i;
    localized.isbn = edition.isbn ?? [];
    return localized;
  });
  // Lists render catalogue covers immediately. More providers are resolved lazily
  // by BookCover only for visible books whose supplied images have failed.
  return docs.map(mapOLDoc);
}

async function olGetBook(workId: string, language?: string): Promise<Book> {
  const [res, catalogue] = await Promise.all([
    fetch(`${OL_API}/works/${encodeURIComponent(workId)}.json`, {
      signal: AbortSignal.timeout(12000),
    }),
    (async () => {
      try {
        const localized = (
          await olSearch(`key:"/works/${workId}"`, 1, 0, "relevance", language)
        )[0];
        // Work ratings remain useful even when a preferred-language edition is absent.
        return (
          localized ?? (language ? (await olSearch(`key:"/works/${workId}"`, 1))[0] : undefined)
        );
      } catch {
        return undefined;
      }
    })(),
  ]);
  if (!res.ok) throw new Error("Libro non trovato");
  const w = (await res.json()) as {
    title?: string;
    description?: string | { value?: string };
    subjects?: string[];
    covers?: number[];
    authors?: { author?: { key?: string } }[];
  };
  const translatedTitles = needsLocalizedTitle(w.title ?? "", language)
    ? await localizedWorkTitles([workId], language)
    : new Map<string, string>();
  const authorNames: string[] = [...(catalogue?.authors ?? [])];
  const preferLatin = !!language && !["ru", "uk", "ar", "ja", "zh", "ko"].includes(language);
  const needsNames =
    !authorNames.length ||
    (preferLatin &&
      authorNames.some((name) =>
        /[\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Han}]/u.test(name),
      ));
  if (needsNames)
    for (const [index, entry] of (w.authors ?? []).slice(0, 6).entries()) {
      const id = entry.author?.key?.match(/^\/authors\/(OL\d+A)$/)?.[1];
      if (!id) continue;
      try {
        const author = await getAuthor(id, authorNames[index], language);
        if (authorNames[index]) authorNames[index] = author.name;
        else authorNames.push(author.name);
      } catch {
        /* Preserve the catalogue name during an outage. */
      }
    }
  let description = descriptionText(
    typeof w.description === "string" ? w.description : w.description?.value,
  );
  if (!description || (language && language !== "en")) {
    // Work-level records can be empty while a particular edition has a synopsis.
    try {
      const response = await fetch(
        `${OL_API}/works/${encodeURIComponent(workId)}/editions.json?limit=40`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (response.ok) {
        const data = (await response.json()) as {
          entries?: { description?: string | { value?: string }; languages?: { key: string }[] }[];
        };
        const editionLanguage = BOOK_LANGUAGES.find((l) => l.code === language)?.ol;
        const entries = [...(data.entries ?? [])]
          .filter(
            (e) =>
              !editionLanguage ||
              e.languages?.some((l) => l.key === `/languages/${editionLanguage}`),
          )
          .sort(
            (a, b) =>
              Number(b.languages?.some((l) => l.key === `/languages/${editionLanguage}`)) -
              Number(a.languages?.some((l) => l.key === `/languages/${editionLanguage}`)),
          );
        description =
          entries
            .map((e) =>
              descriptionText(
                typeof e.description === "string" ? e.description : e.description?.value,
              ),
            )
            .find(Boolean) || description;
      }
    } catch {
      /* Explicit empty state if no source supplies a description. */
    }
  }
  return {
    id: `ol:${workId}`,
    title: translatedTitles.get(workId) ?? catalogue?.title ?? w.title ?? "Senza titolo",
    authors: authorNames,
    cover_url:
      catalogue?.cover_url ??
      (w.covers?.[0] ? `https://covers.openlibrary.org/b/id/${w.covers[0]}-L.jpg` : null),
    published_year: catalogue?.published_year ?? null,
    page_count: catalogue?.page_count ?? null,
    cover_candidates: catalogue?.cover_candidates ?? [],
    isbns: catalogue?.isbns ?? [],
    average_rating: catalogue?.average_rating ?? null,
    ratings_count: catalogue?.ratings_count ?? null,
    rating_source: catalogue?.rating_source,
    categories: (w.subjects ?? []).slice(0, 6),
    description: description || null,
  };
}

// ---------- Public API ----------

export async function searchBooks(
  query: string,
  opts: {
    max?: number;
    orderBy?: "relevance" | "newest";
    startIndex?: number;
    language?: string | undefined;
  } = {},
) {
  if (!query.trim()) return [];
  const local = supplementSearch(query);
  const max = Math.max(1, Math.min(40, opts.max ?? 20));
  const params = new URLSearchParams({
    q: query,
    maxResults: String(max),
    orderBy: opts.orderBy ?? "relevance",
    startIndex: String(opts.startIndex ?? 0),
    printType: "books",
  });
  applyBookLanguage(params, "google", opts.language);
  try {
    const out = await gbSearch({ data: { params: Object.fromEntries(params) } });
    if (out.status !== 200) {
      const err = new Error(`HTTP ${out.status}`) as Error & { status?: number };
      err.status = out.status;
      throw err;
    }
    const data = JSON.parse(out.json || "{}") as { items?: Volume[] };
    const books = (data.items ?? []).map(mapVolume);
    if (books.length) return bookSuggestions([...local, ...books], max);
  } catch {
    // Missing keys, upstream outages and exhausted quotas all use the public fallback.
  }
  try {
    return bookSuggestions(
      [
        ...local,
        ...(await olSearch(
          query,
          max,
          opts.startIndex ?? 0,
          opts.orderBy ?? "relevance",
          opts.language,
        )),
      ],
      max,
    );
  } catch (error) {
    if (local.length) return local;
    throw error;
  }
}

/** Work-level autocomplete: one request, no serial cover lookups on each keystroke. */
export async function searchBookSuggestions(
  query: string,
  signal?: AbortSignal,
  language?: string,
): Promise<Book[]> {
  const clean = query.trim();
  if (clean.length < 2) return [];
  if (/^(?:[\d\s-]{10,})$/.test(clean)) return bookSuggestions(await searchByIsbn(clean));
  const completion = catalogueCompletionQuery(clean);
  if (!completion) return [];
  try {
    const params = new URLSearchParams({
      q: completion,
      limit: "20",
      ...(language ? { lang: language } : {}),
      fields:
        "key,title,author_name,first_publish_year,cover_i,isbn,editions,editions.title,editions.cover_i,editions.isbn",
    });
    // Very short titles ("It") drown in prefix matches: also ask for the exact title.
    const short = clean.length <= 4 && !clean.includes(" ");
    const exact = short
      ? new URLSearchParams({
          q: `title:"${clean.replace(/["\\]/g, "")}"`,
          limit: "10",
          sort: "editions",
          fields: params.get("fields")!,
          ...(language ? { lang: language } : {}),
        })
      : null;
    const [response, exactResponse] = await Promise.all([
      olCatalogueSearch({
        ...(signal ? { signal } : {}),
        data: { params: Object.fromEntries(params) },
      }),
      exact
        ? olCatalogueSearch({
            ...(signal ? { signal } : {}),
            data: { params: Object.fromEntries(exact) },
          }).catch(() => null)
        : Promise.resolve(null),
    ]);
    if (response.status !== 200) throw new Error("Catalogo non disponibile");
    const { docs: mainDocs = [] } = JSON.parse(response.json) as { docs?: OLDoc[] };
    const exactDocs =
      exactResponse?.status === 200
        ? ((JSON.parse(exactResponse.json) as { docs?: OLDoc[] }).docs ?? []).filter(
            (doc) => workTitle(doc.title ?? "") === workTitle(clean),
          )
        : [];
    const docs = [...exactDocs, ...mainDocs];
    const books = docs
      .map((doc) => {
        const edition = doc.editions?.docs?.[0];
        const localized: OLDoc = { ...doc };
        // Never replace a readable work title with an edition in an unexpected script.
        if (
          edition?.title &&
          !(needsLocalizedTitle(edition.title, language ?? "it") && !needsLocalizedTitle(doc.title ?? "", language ?? "it"))
        )
          localized.title = edition.title;
        if (edition?.cover_i) localized.cover_i = edition.cover_i;
        if (edition?.isbn) localized.isbn = edition.isbn;
        return mapOLDoc(localized);
      })
      .filter((book) => matchesCatalogueCompletion(book, clean))
      .map((book, index) => ({ book, index, exact: workTitle(book.title) === workTitle(clean) }))
      .sort((a, b) => Number(b.exact) - Number(a.exact) || a.index - b.index)
      .map((item) => item.book);
    if (books.length) return bookSuggestions([...supplementSearch(clean), ...books]);
  } catch (error) {
    if (signal?.aborted) throw error;
  }
  // Keep verified gaps available even when both remote providers are unavailable.
  const local = supplementSearch(clean);
  try {
    return bookSuggestions([
      ...local,
      ...(await searchBooks(clean, { max: 20, language })).filter((book) =>
        matchesCatalogueCompletion(book, clean),
      ),
    ]);
  } catch (error) {
    if (signal?.aborted || !local.length) throw error;
    return local;
  }
}

/** Enrich incomplete stored records while keeping their original ID and chosen cover. */
export async function enrichBook(book: Book): Promise<Book> {
  let source: Book | undefined;
  try {
    if (book.id.startsWith("ol:")) source = await olGetBook(book.id.slice(3));
    else {
      const isbn = book.id.startsWith("csv:isbn:") ? book.id.slice(9) : book.isbns?.[0];
      const hits = await olSearch(
        isbn ? `isbn:${isbn}` : `intitle:"${book.title}" inauthor:"${book.authors[0] ?? ""}"`,
        5,
      );
      source = isbn ? hits[0] : hits.find((hit) => sameBook(book, hit));
      if (source?.id.startsWith("ol:")) source = await olGetBook(source.id.slice(3));
      else if (source && !source.description) {
        const detail = await gbVolume({ data: { id: source.id } });
        if (detail.status === 200 && detail.json)
          source = mapVolume(JSON.parse(detail.json) as Volume);
      }
    }
  } catch {
    /* Cached metadata remains usable when providers fail. */
  }
  if (!source) return book;
  const candidates = [...new Set([...coverUrls(book), ...coverUrls(source)])];
  return {
    ...book,
    cover_url: book.cover_url || source.cover_url,
    cover_candidates: candidates,
    average_rating: book.average_rating ?? source.average_rating ?? null,
    ratings_count:
      (book.average_rating != null ? book.ratings_count : source.ratings_count) ?? null,
    rating_source: book.average_rating != null ? book.rating_source : source.rating_source,
    isbns: source.isbns ?? book.isbns ?? [],
    description: descriptionText(book.description) || source.description,
    page_count: book.page_count ?? source.page_count,
    published_year: book.published_year ?? source.published_year,
    categories: book.categories.length ? book.categories : source.categories,
  };
}

async function localizedBookEdition(book: Book, language?: string): Promise<Book> {
  if (!language || book.content_language === language || !book.isbns?.length || isMangaId(book.id))
    return book;
  try {
    const hits = await olSearch(`isbn:${book.isbns[0]}`, 1, 0, "relevance", language);
    const edition = hits[0];
    if (!edition?.id.startsWith("ol:")) return book;
    const localized = await olGetBook(edition.id.slice(3), language);
    return {
      ...book,
      title: localized.title,
      authors: localized.authors.length ? localized.authors : book.authors,
      cover_url: localized.cover_url || book.cover_url,
      cover_candidates: [...coverUrls(localized), ...coverUrls(book)],
      description: localized.description || book.description,
      content_language: language,
    };
  } catch {
    return book;
  }
}
export async function getBook(id: string, language?: string): Promise<Book> {
  const { data: cached } = await supabase.from("books").select("*").eq("id", id).maybeSingle();
  const supplement = CATALOGUE_SUPPLEMENT.find((book) => book.id === id);
  if (
    supplement &&
    (supplement.content_language === language || !language || !id.startsWith("ol:"))
  )
    return {
      ...supplement,
      ...(cached ?? {}),
      isbns: supplement.isbns ?? [],
      description: cached?.description || supplement.description,
    };
  if (isMangaId(id)) {
    try {
      const manga = (
        await mangaCatalogue({
          data: {
            ...(id.startsWith("manga:mal:")
              ? { malId: Number(id.slice(10)) }
              : { id: id.slice(9) }),
            ...(language ? { language } : {}),
          },
        })
      )[0];
      if (manga) return { ...manga, cover_url: cached?.cover_url || manga.cover_url };
    } catch (error) {
      if (!cached) throw error;
    }
    if (cached)
      return {
        ...(cached as Book),
        manga: {
          totalVolumes: null,
          status: "unknown",
          source: id.startsWith("manga:mal:")
            ? `https://myanimelist.net/manga/${id.slice(10)}`
            : `https://mangadex.org/title/${id.slice(9)}`,
        },
      };
    throw Error("Serie non trovata");
  }
  if (cached) {
    let book = cached as Book;
    // Cached rows intentionally contain only catalogue fields. Restore provider
    // ratings and ISBNs without replacing the user's chosen cover or title.
    if (!id.includes(":") && book.average_rating == null) {
      try {
        const detail = await gbVolume({ data: { id } });
        if (detail.status === 200 && detail.json) {
          const volume = mapVolume(JSON.parse(detail.json) as Volume);
          book = {
            ...book,
            content_language: volume.content_language,
            average_rating: volume.average_rating ?? null,
            ratings_count: volume.ratings_count ?? null,
            rating_source: volume.rating_source,
            isbns: volume.isbns ?? book.isbns ?? [],
          };
        }
      } catch {
        /* Other catalogues remain available during provider outages. */
      }
    }
    if (language && id.startsWith("ol:")) {
      try {
        const localized = await olGetBook(id.slice(3), language);
        return {
          ...book,
          ...localized,
          cover_url: localized.cover_url || book.cover_url,
          description: localized.description || descriptionText(book.description),
        };
      } catch {
        /* Stored metadata remains available when localization fails. */
      }
    }

    // Search results often have no synopsis. Do not let that incomplete cache
    // permanently suppress the full work/edition description.
    const enriched =
      !book.description || !book.cover_url || book.average_rating == null
        ? await enrichBook(book)
        : book;
    if (enriched !== book) {
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        // Only fill absent fields. Conditional writes protect choices made while
        // the remote lookup was running (for example a newly uploaded cover).
        if (!book.description && enriched.description)
          await supabase
            .from("books")
            .update({ description: enriched.description })
            .eq("id", id)
            .is("description", null);
        if (!book.cover_url && enriched.cover_url)
          await supabase
            .from("books")
            .update({ cover_url: enriched.cover_url })
            .eq("id", id)
            .is("cover_url", null);
      }
    }
    return localizedBookEdition(enriched, language);
  }
  if (id.startsWith("ol:")) return olGetBook(id.slice(3), language);
  const out = await gbVolume({ data: { id } });
  if (out.status !== 200 || !out.json) throw new Error("Libro non trovato");
  const book = mapVolume(JSON.parse(out.json) as Volume);
  return localizedBookEdition(
    !book.description || !book.cover_url ? await enrichBook(book) : book,
    language,
  );
}

/** Look up a book from a scanned barcode / ISBN. */
export async function searchByIsbn(isbn: string) {
  const clean = isbn.replace(/[^0-9Xx]/g, "");
  if (!clean) return [];
  const direct = await searchBooks(`isbn:${clean}`, { max: 5 });
  if (direct.length) return direct;
  return searchBooks(clean, { max: 5 });
}

export async function booksByAuthor(author: string) {
  return searchBooks(`inauthor:"${author}"`, { max: 24 });
}

export async function discoverBooks(opts: {
  genre?: string;
  year?: string;
  order?: "relevance" | "newest";
  query?: string;
  language?: string | undefined;
}) {
  const parts: string[] = [];
  if (opts.query?.trim()) parts.push(opts.query.trim());
  if (opts.genre && opts.genre !== "all") parts.push(genreQuery(opts.genre));
  if (!parts.length) parts.push("subject:fiction");
  const books = await searchBooks(parts.join(" "), {
    max: 30,
    orderBy: opts.order ?? "relevance",
    language: opts.language,
  });
  if (opts.year && opts.year !== "all") {
    const from = Number(opts.year);
    return books.filter((b) => (b.published_year ?? 0) >= from);
  }
  return books;
}

/** Store the book in the shared catalogue so library rows can reference it. */
export async function cacheBook(book: Book) {
  const { data: existing } = await supabase
    .from("books")
    .select("cover_url,description")
    .eq("id", book.id)
    .maybeSingle();
  const { error } = await supabase.from("books").upsert(
    {
      id: book.id,
      title: book.title,
      authors: book.authors,
      cover_url: existing?.cover_url || book.cover_url,
      published_year: book.published_year,
      page_count: book.page_count,
      categories: book.categories,
      description: descriptionText(existing?.description || book.description) || null,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) throw error;
}

export const GENRES = [
  "Fiction",
  "Nonfiction",
  "Fantasy",
  "Science Fiction",
  "Mystery",
  "Thriller",
  "Romance",
  "History",
  "Biography",
  "Philosophy",
  "Poetry",
  "Science",
  "Business",
];

/** Se manca la copertina, prova Open Library (per ISBN, poi per titolo+autore). */
export async function withCover(book: Book, isbn?: string): Promise<Book> {
  if (book.cover_url) return book;
  const code = (isbn ?? "").replace(/[^0-9Xx]/g, "");
  if (code) {
    const url = `https://covers.openlibrary.org/b/isbn/${code}-L.jpg?default=false`;
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return { ...book, cover_url: url };
    } catch {
      /* ignora */
    }
  }
  try {
    const q = [book.title, book.authors[0]].filter(Boolean).join(" ");
    const hits = await olSearch(q, 3);
    const found = hits.find((h) => h.cover_url);
    if (found?.cover_url) return { ...book, cover_url: found.cover_url };
  } catch {
    /* ignora */
  }
  return book;
}

/** Proposte di copertina alternative (Google Libri + Open Library). */
export async function coverCandidates(
  book: Book,
  includeEditions = false,
  language?: string,
): Promise<string[]> {
  if (isMangaId(book.id)) {
    const id =
      book.manga?.mangaDexId ?? (book.id.startsWith("manga:md:") ? book.id.slice(9) : null);
    const covers = id
      ? await mangaCovers({ data: { id, ...(language ? { language } : {}) } }).catch(() => [])
      : [];
    return [...new Set([...coverUrls(book), ...covers.map((c) => c.url)])];
  }
  const q = [book.title, book.authors[0]].filter(Boolean).join(" ");
  const urls: string[] = [];
  urls.push(...coverUrls(book));
  const [g, o, thumbnails] = await Promise.allSettled([
    searchBooks(
      `intitle:"${book.title}"${book.authors[0] ? ` inauthor:"${book.authors[0]}"` : ""}`,
      { max: 12, language },
    ),
    olSearch(q, 12, 0, "relevance", language),
    gbCovers({ data: { isbns: (book.isbns ?? []).slice(0, 10) } }),
  ]);
  if (thumbnails.status === "fulfilled") urls.push(...Object.values(thumbnails.value));
  for (const r of [g, o]) {
    if (r.status !== "fulfilled") continue;
    for (const b of r.value) if (b.id === book.id || sameBook(book, b)) urls.push(...coverUrls(b));
  }
  // Work search returns one preferred edition. Load its actual editions only when
  // the user opens the picker, rather than crowding autocomplete with duplicates.
  let workId = book.id.match(/^ol:(OL\d+W)$/)?.[1];
  if (!workId && o.status === "fulfilled") {
    workId = o.value.find((candidate) => sameBook(book, candidate))?.id.match(/^ol:(OL\d+W)$/)?.[1];
  }
  if (includeEditions && workId) {
    try {
      const response = await fetch(`${OL_API}/works/${workId}/editions.json?limit=50`, {
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) {
        const data = (await response.json()) as { entries?: { covers?: number[] }[] };
        for (const edition of data.entries ?? [])
          for (const cover of edition.covers ?? [])
            if (Number.isSafeInteger(cover) && cover > 0)
              urls.push(`https://covers.openlibrary.org/b/id/${cover}-L.jpg`);
      }
    } catch {
      /* Existing candidates remain selectable if editions are unavailable. */
    }
  }
  return Array.from(new Set(urls));
}

/** Salva una copertina personale: visibile solo a chi la sceglie. */
export async function setBookCover(bookId: string, url: string) {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Accedi di nuovo.");
  const { data, error } = await supabase
    .from("library_items")
    .update({ custom_cover_url: url })
    .eq("user_id", auth.user.id)
    .eq("book_id", bookId)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("Aggiungi prima il libro alla tua libreria.");
}

/** Carica un'immagine dell'utente e restituisce l'indirizzo pubblico firmato. */
export async function uploadCover(userId: string, bookId: string, file: File) {
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userId}/${bookId.replace(/[^A-Za-z0-9_-]/g, "")}-${Date.now()}.${ext || "jpg"}`;
  const { error } = await supabase.storage
    .from("covers")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage
    .from("covers")
    .createSignedUrl(path, 60 * 60 * 24 * 3650);
  if (signErr || !data?.signedUrl)
    throw signErr ?? new Error("Impossibile creare il link dell'immagine");
  return data.signedUrl;
}
