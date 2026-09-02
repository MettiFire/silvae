import { supabase } from "@/integrations/supabase/client";

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
  if (!res.ok) throw new Error("Errore nel recupero dei libri");
  return (await res.json()) as { items?: Volume[] };
}

export async function searchBooks(query: string, opts: { max?: number; orderBy?: "relevance" | "newest"; startIndex?: number } = {}) {
  if (!query.trim()) return [];
  const params = new URLSearchParams({
    q: query,
    maxResults: String(opts.max ?? 20),
    orderBy: opts.orderBy ?? "relevance",
    startIndex: String(opts.startIndex ?? 0),
    printType: "books",
  });
  const data = await get(`${API}?${params}`);
  return (data.items ?? []).map(mapVolume);
}

export async function getBook(id: string): Promise<Book> {
  const res = await fetch(`${API}/${id}`);
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
