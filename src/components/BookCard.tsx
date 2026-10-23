import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { coverCandidates, type Book } from "@/lib/books";
import { useResolvedBookCover } from "@/lib/book-cover-state";
import { displayCoverUrls } from "@/lib/book-metadata";
import { BookmarkRating } from "@/components/BookmarkRating";
import { useBookDensity } from "@/lib/book-density";
import { cn } from "@/lib/utils";

export function BookCover({
  book,
  className,
  priority = false,
  fit = "cover",
  onCoverLoad,
}: {
  book: Book;
  className?: string;
  priority?: boolean;
  fit?: "cover" | "contain";
  onCoverLoad?: (url: string) => void;
}) {
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const [visible, setVisible] = useState(priority);
  const [loadedUrl, setLoadedUrl] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const { cover: resolvedCover, remember } = useResolvedBookCover(book.id);
  const initial = displayCoverUrls(book, resolvedCover);
  const exhausted = !initial.some((url) => !failed.has(url));
  const { data: alternatives = [] } = useQuery({
    queryKey: ["cover-fallbacks", book.id, book.cover_url],
    queryFn: () => coverCandidates(book),
    enabled: visible && exhausted,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
  const source = [...new Set([...initial, ...alternatives])].find((url) => !failed.has(url));
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [book.id]);
  useEffect(() => {
    if (!source || !visible || loadedUrl === source) return;
    // Some cover hosts hang instead of returning 404: move to the next edition.
    const timer = setTimeout(() => setFailed((previous) => new Set(previous).add(source)), 8000);
    return () => clearTimeout(timer);
  }, [source, visible, loadedUrl]);
  useEffect(() => {
    if (loadedUrl && loadedUrl === source) onCoverLoad?.(loadedUrl);
  }, [loadedUrl, source, onCoverLoad]);
  return (
    <div ref={ref} className={cn("cover-frame relative overflow-hidden", className)}>
      {source ? (
        (visible || priority) && (
          <img
            key={source}
            src={source}
            alt={`Copertina di ${book.title}`}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            width={300}
            height={450}
            referrerPolicy="no-referrer"
            className={cn("h-full w-full", fit === "contain" ? "object-contain" : "object-cover")}
            onLoad={(e) => {
              if (e.currentTarget.naturalWidth <= 2)
                setFailed((previous) => new Set(previous).add(source));
              else {
                setLoadedUrl(source);
                if (!book.custom_cover_url) remember(source);
              }
            }}
            onError={() => setFailed((previous) => new Set(previous).add(source))}
          />
        )
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center">
          <span className="font-display text-xs text-muted-foreground">{book.title}</span>
          <span className="text-[10px] text-muted-foreground">Copertina non disponibile</span>
        </div>
      )}
    </div>
  );
}

export function BookCard({
  book,
  rating,
  favorite,
  onToggleFavorite,
  compact,
  footer,
}: {
  book: Book;
  rating?: number | null;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  compact?: boolean;
  footer?: React.ReactNode;
}) {
  const density = useBookDensity();
  const small = compact ?? density === "compact";
  return (
    <div className="book-card group relative">
      <Link to="/book/$bookId" params={{ bookId: book.id }} className="block">
        <div className="cover-wrap relative overflow-hidden">
          <BookCover book={book} />
        </div>
        <h3
          className={cn(
            "mt-2 line-clamp-2 font-display font-semibold leading-snug",
            small ? "text-xs" : "text-sm",
          )}
        >
          {book.title}
        </h3>
        <p className="line-clamp-1 text-xs text-muted-foreground">{book.authors.join(", ")}</p>
      </Link>
      {rating != null && <BookmarkRating value={rating} readOnly size={14} className="mt-1" />}
      {onToggleFavorite && (
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-label={favorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
          aria-pressed={favorite}
          className="absolute right-2 top-2 rounded-full bg-card/85 p-1.5 opacity-0 backdrop-blur transition group-hover:opacity-100 focus-visible:opacity-100 data-[on=true]:opacity-100"
          data-on={favorite}
        >
          <Heart
            className={cn(
              "h-4 w-4",
              favorite ? "fill-primary text-primary" : "text-muted-foreground",
            )}
          />
        </button>
      )}
      {footer}
    </div>
  );
}
