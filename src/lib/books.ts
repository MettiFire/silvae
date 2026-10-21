import { supabase } from "@/integrations/supabase/client";
import { gbSearch, gbVolume, gbCovers } from "@/lib/google-books.functions";

export type Book = {
  id: string;
  title: string;
  authors: string[];
  cover_url: string | null;
  published_year: number | null;
  page_count: number | null;
  categories: string[];
  description: string | null;
  average_rating?: number | null;
  ratings_count?: number | null;
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
    pageCount?: number;
    categories?: string[];
    description?: string;
    averageRating?: number;
    ratingsCount?: number;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string; large?: string; extraLarge?: string };
  };
};

export function mapVolume(v: Volume): Book {
  const i = v.volumeInfo ?? {};
  const year = i.publishedDate ? Number(i.publishedDate.slice(0, 4)) : null;
  return {
    id: v.id,
    title: i.title ?? "Senza titolo",
    authors: i.authors ?? [],
    cover_url: upgradeCover(i.imageLinks?.extraLarge ?? i.imageLinks?.large ?? i.imageLinks?.thumbnail),
    published_year: Number.isFinite(year) ? year : null,
    page_count: i.pageCount ?? null,
    categories: i.categories ?? [],
    description: i.description ?? null,
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
    average_rating: d.ratings_average ?? null,
    ratings_count: d.ratings_count ?? null,
  };
}

async function olSearch(query: string, max: number, startIndex = 0, order: "relevance" | "newest" = "relevance"): Promise<Book[]> {
  const params = new URLSearchParams({ limit: String(max), offset: String(startIndex),
    fields: "key,title,author_name,first_publish_year,number_of_pages_median,subject,cover_i,isbn,ratings_average,ratings_count" });
  if (order === "newest") params.set("sort", "new");
  // Preserve ISBN/author/subject semantics rather than turning everything into keywords.
  const isbn = query.match(/^isbn:(.+)$/);
  const author = query.match(/^inauthor:"?([^"\n]+)"?$/);
  const subject = query.match(/^subject:"?([^"\n]+)"?$/);
  if (isbn) params.set("isbn", isbn[1]!.trim());
  else if (author) params.set("author", author[1]!.trim());
  else if (subject) params.set("subject", subject[1]!.trim());
  else params.set("q", query.replace(/intitle:/g, "title:").replace(/inauthor:/g, "author:"));
  const res = await fetch(`${OL_API}/search.json?${params}`, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error("Errore nel recupero dei libri");
  const data = (await res.json()) as { docs?: OLDoc[] };
  const docs = data.docs ?? [];
  let covers: Record<string, string> = {};
  try {
    covers = await gbCovers({ data: { isbns: docs.flatMap(d => (d.isbn ?? []).slice(0, 3)) } });
  } catch { /* The original Open Library cover remains available as fallback. */ }
  return docs.map(d => {
    const book = mapOLDoc(d);
    const cover = (d.isbn ?? []).map(i => covers[i]).find(Boolean);
    return cover ? { ...book, cover_url: cover } : book;
  });
}

async function olGetBook(workId: string): Promise<Book> {
  const res = await fetch(`${OL_API}/works/${encodeURIComponent(workId)}.json`, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error("Libro non trovato");
  const w = (await res.json()) as {
    title?: string;
    description?: string | { value?: string };
    subjects?: string[];
    covers?: number[];
    authors?: { author?: { key?: string } }[];
  };
  let catalogue: Book | undefined;
  try { catalogue = (await olSearch(`key:/works/${workId}`, 1))[0]; } catch { /* Work details still render. */ }
  const authorNames: string[] = [...(catalogue?.authors ?? [])];
  for (const a of authorNames.length ? [] : (w.authors ?? [])) {
    const key = a.author?.key;
    if (!key) continue;
    try {
      const ar = await fetch(`${OL_API}${key}.json`, { signal: AbortSignal.timeout(8000) });
      if (ar.ok) {
        const ad = (await ar.json()) as { name?: string };
        if (ad.name) authorNames.push(ad.name);
      }
    } catch {
      /* ignore author lookup failures */
    }
  }
  return {
    id: `ol:${workId}`,
    title: w.title ?? "Senza titolo",
    authors: authorNames,
    cover_url: catalogue?.cover_url ?? (w.covers?.[0] ? `https://covers.openlibrary.org/b/id/${w.covers[0]}-L.jpg` : null),
    published_year: catalogue?.published_year ?? null,
    page_count: catalogue?.page_count ?? null,
    categories: (w.subjects ?? []).slice(0, 6),
    description: typeof w.description === "string" ? w.description : (w.description?.value ?? null),
  };
}

// ---------- Public API ----------

export async function searchBooks(query: string, opts: { max?: number; orderBy?: "relevance" | "newest"; startIndex?: number } = {}) {
  if (!query.trim()) return [];
  const max = Math.max(1, Math.min(40, opts.max ?? 20));
  const params = new URLSearchParams({
    q: query,
    maxResults: String(max),
    orderBy: opts.orderBy ?? "relevance",
    startIndex: String(opts.startIndex ?? 0),
    printType: "books",
  });
  try {
    const out = await gbSearch({ data: { params: Object.fromEntries(params) } });
    if (out.status !== 200) {
      const err = new Error(`HTTP ${out.status}`) as Error & { status?: number };
      err.status = out.status;
      throw err;
    }
    const data = JSON.parse(out.json || "{}") as { items?: Volume[] };
    const books = (data.items ?? []).map(mapVolume);
    if (books.length) return books;
  } catch {
    // Missing keys, upstream outages and exhausted quotas all use the public fallback.
  }
  return olSearch(query, max, opts.startIndex ?? 0, opts.orderBy ?? "relevance");
}

export async function getBook(id: string): Promise<Book> {
  // Imported books and manually chosen covers must survive API outages and reloads.
  const { data: cached } = await supabase.from("books").select("*").eq("id", id).maybeSingle();
  if (cached) return cached as Book;
  if (id.startsWith("ol:")) return olGetBook(id.slice(3));
  const out = await gbVolume({ data: { id } });
  if (out.status !== 200 || !out.json) throw new Error("Libro non trovato");
  return mapVolume(JSON.parse(out.json) as Volume);
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
}) {
  const parts: string[] = [];
  if (opts.query?.trim()) parts.push(opts.query.trim());
  if (opts.genre && opts.genre !== "all") parts.push(`subject:"${opts.genre}"`);
  if (!parts.length) parts.push("subject:fiction");
  const books = await searchBooks(parts.join(" "), { max: 30, orderBy: opts.order ?? "relevance" });
  if (opts.year && opts.year !== "all") {
    const from = Number(opts.year);
    return books.filter((b) => (b.published_year ?? 0) >= from);
  }
  return books;
}

/** Store the book in the shared catalogue so library rows can reference it. */
export async function cacheBook(book: Book) {
  const { error } = await supabase.from("books").upsert(
    {
      id: book.id,
      title: book.title,
      authors: book.authors,
      cover_url: book.cover_url,
      published_year: book.published_year,
      page_count: book.page_count,
      categories: book.categories,
      description: book.description,
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

export const GENRES = [
  "Fiction",
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
export async function coverCandidates(book: Book): Promise<string[]> {
  const q = [book.title, book.authors[0]].filter(Boolean).join(" ");
  const urls: string[] = [];
  if (book.cover_url) urls.push(book.cover_url);
  const [g, o] = await Promise.allSettled([
    searchBooks(`intitle:"${book.title}"${book.authors[0] ? ` inauthor:"${book.authors[0]}"` : ""}`, { max: 12 }),
    olSearch(q, 12),
  ]);
  for (const r of [g, o]) {
    if (r.status !== "fulfilled") continue;
    for (const b of r.value) if (b.cover_url) urls.push(b.cover_url);
  }
  return Array.from(new Set(urls));
}

/** Salva una nuova copertina nel catalogo condiviso. */
export async function setBookCover(bookId: string, url: string) {
  const { error } = await supabase.from("books").update({ cover_url: url }).eq("id", bookId);
  if (error) throw error;
}

/** Carica un'immagine dell'utente e restituisce l'indirizzo pubblico firmato. */
export async function uploadCover(userId: string, bookId: string, file: File) {
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userId}/${bookId.replace(/[^A-Za-z0-9_-]/g, "")}-${Date.now()}.${ext || "jpg"}`;
  const { error } = await supabase.storage.from("covers").upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage.from("covers").createSignedUrl(path, 60 * 60 * 24 * 3650);
  if (signErr || !data?.signedUrl) throw signErr ?? new Error("Impossibile creare il link dell'immagine");
  return data.signedUrl;
}
