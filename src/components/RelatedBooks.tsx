import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookCard } from "./BookCard";
import { SectionHeading } from "./AppShell";
import { searchBooks, type Book } from "@/lib/books";
import { relatedBookSources, rankRelatedBooks } from "@/lib/related-books";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { useBookLanguage } from "@/lib/use-book-language";
import { parsePreferences, PREFERENCES_FIELD } from "@/lib/reading-preferences";
import { sameAuthorName } from "@/lib/work-identity";
import { useRecommendationWorkFilter } from "@/lib/use-recommendation-work-filter";

export function RelatedBooks({ book }: { book: Book }) {
  const section = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!section.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);
  const { user, loading: authLoading } = useAuth();
  const preferences = parsePreferences(user?.user_metadata[PREFERENCES_FIELD]);
  const { language, ready } = useBookLanguage(preferences?.language);
  const library = useLibrary(user?.id);
  const sources = relatedBookSources(book);
  const suggestions = useQuery({
    queryKey: [
      "related-books",
      book.id,
      sources.map((source) => source.query).join("|"),
      language ?? "any",
    ],
    enabled: visible && ready && !authLoading && sources.length > 0,
    queryFn: async () => {
      const results = await Promise.allSettled(
        sources.map(async (source) => {
          const books = await searchBooks(source.query, { max: 12, language });
          return books
            .filter(
              (candidate) =>
                !source.author ||
                candidate.authors.some((author) => sameAuthorName(author, source.author!)),
            )
            .map((book) => ({ book, source }));
        }),
      );
      if (results.every((result) => result.status === "rejected"))
        throw Error("Catalogo non disponibile");
      return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
    },
    staleTime: 30 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const candidates = useMemo(
    () => suggestions.data?.map((item) => item.book) ?? [],
    [suggestions.data],
  );
  const excluded = useMemo(
    () => [book, ...(library.data ?? []).flatMap((item) => (item.books ? [item.books] : []))],
    [book, library.data],
  );
  const { eligible, identities, verifying } = useRecommendationWorkFilter(candidates, excluded);
  const eligibleIds = new Set(eligible.map((book) => book.id));
  const libraryReady = !authLoading && (!user || (!library.isPending && !library.isError));
  const related = libraryReady
    ? rankRelatedBooks(
        book,
        (suggestions.data ?? []).filter((item) => eligibleIds.has(item.book.id)),
        identities,
        preferences?.avoided ?? [],
      )
    : [];
  const loading =
    authLoading ||
    (!!user && library.isPending) ||
    (sources.length > 0 && suggestions.isPending) ||
    (!related.length && verifying);
  const error = suggestions.isError || (!!user && library.isError);
  return (
    <section ref={section} className="mt-12" aria-labelledby="related-books-title">
      <div id="related-books-title">
        <SectionHeading title="Se ti interessa questo libro" />
      </div>
      <p className="-mt-3 mb-6 text-sm text-muted-foreground">
        Altre letture vicine per generi e autori, senza riproporre i libri già nella tua libreria.
      </p>
      {error ? (
        <p role="status" className="text-sm text-muted-foreground">
          Non riesco a caricare i libri simili.{" "}
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={() => {
              void suggestions.refetch();
              if (user && library.isError) void library.refetch();
            }}
          >
            Riprova
          </button>
        </p>
      ) : loading ? (
        <div className="book-grid grid" aria-label="Caricamento libri simili" role="status">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="aspect-[2/3] animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : related.length ? (
        <div className="book-grid grid">
          {related.map(({ book, reason }) => (
            <div key={book.id}>
              <BookCard book={book} />
              <p className="mt-2 text-xs text-muted-foreground">{reason}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Non ci sono ancora altri titoli affini da mostrarti.{" "}
          <Link to="/discover" className="text-primary underline underline-offset-4">
            Esplora il catalogo
          </Link>
        </p>
      )}
    </section>
  );
}
