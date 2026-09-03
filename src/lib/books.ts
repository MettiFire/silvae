import { supabase } from "@/integrations/supabase/client";
import { gbSearch, gbVolume } from "@/lib/google-books.functions";

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

const API = "https://www.googleapis.com/books/v1/volumes";
const OL_API = "https://openlibrary.org";

/**
 * Optional Google Books API key. Anonymous requests share a small daily quota
 * (HTTP 429 when exhausted); a free key from Google Cloud Console removes the
 * limit. Paste it here when you have one.
 */
export const GOOGLE_BOOKS_API_KEY = "";

function upgradeCover(url?: string) {
  if (!url) return null;
  return url.replace("http://", "https://").replace("&edge=curl", "").replace("zoom=1", "zoom=3");
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

async function get(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return (await res.json()) as { items?: Volume[] };
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
  };
}

async function olSearch(query: string, max: number): Promise<Book[]> {
  const params = new URLSearchParams({ q: query, limit: String(max) });
  const res = await fetch(`${OL_API}/search.json?${params}`);
  if (!res.ok) throw new Error("Errore nel recupero dei libri");
  const data = (await res.json()) as { docs?: OLDoc[] };
  return (data.docs ?? []).map(mapOLDoc);
}

async function olGetBook(workId: string): Promise<Book> {
  const res = await fetch(`${OL_API}/works/${workId}.json`);
  if (!res.ok) throw new Error("Libro non trovato");
  const w = (await res.json()) as {
    title?: string;
    description?: string | { value?: string };
    subjects?: string[];
    covers?: number[];
    authors?: { author?: { key?: string } }[];
  };
  const authorNames: string[] = [];
  for (const a of w.authors ?? []) {
    const key = a.author?.key;
    if (!key) continue;
    try {
      const ar = await fetch(`${OL_API}${key}.json`);
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
    cover_url: w.covers?.[0] ? `https://covers.openlibrary.org/b/id/${w.covers[0]}-L.jpg` : null,
    published_year: null,
    page_count: null,
    categories: (w.subjects ?? []).slice(0, 6),
    description: typeof w.description === "string" ? w.description : (w.description?.value ?? null),
  };
}

function isQuotaError(e: unknown) {
  return typeof e === "object" && e !== null && "status" in e && (e as { status?: number }).status === 429;
}

// ---------- Public API ----------

export async function searchBooks(query: string, opts: { max?: number; orderBy?: "relevance" | "newest"; startIndex?: number } = {}) {
  if (!query.trim()) return [];
  const max = opts.max ?? 20;
  const params = new URLSearchParams({
    q: query,
    maxResults: String(max),
    orderBy: opts.orderBy ?? "relevance",
    startIndex: String(opts.startIndex ?? 0),
    printType: "books",
  });
  if (GOOGLE_BOOKS_API_KEY) params.set("key", GOOGLE_BOOKS_API_KEY);
  try {
    const data = await get(`${API}?${params}`);
    return (data.items ?? []).map(mapVolume);
  } catch (e) {
    if (!isQuotaError(e)) throw new Error("Errore nel recupero dei libri");
    // Google Books anonymous quota exhausted: fall back to Open Library.
    return olSearch(query.replace(/(isbn|inauthor|subject):/g, ""), max);
  }
}

export async function getBook(id: string): Promise<Book> {
  if (id.startsWith("ol:")) return olGetBook(id.slice(3));
  const url = GOOGLE_BOOKS_API_KEY ? `${API}/${id}?key=${GOOGLE_BOOKS_API_KEY}` : `${API}/${id}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Libro non trovato");
  return mapVolume((await res.json()) as Volume);
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
