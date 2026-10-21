import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import type { Book } from "@/lib/books";
import { BookmarkRating } from "@/components/BookmarkRating";
import { cn } from "@/lib/utils";

export function BookCover({ book, className }: { book: Pick<Book, "title" | "cover_url">; className?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!book.cover_url || failedUrl === book.cover_url) {
    return (
      <div className={cn("cover-frame flex items-center justify-center p-3 text-center", className)}>
        <span className="font-display text-xs text-muted-foreground">{book.title}</span>
      </div>
    );
  }
  return (
    <img onError={() => setFailedUrl(book.cover_url)} src={book.cover_url} alt={`Copertina di ${book.title}`} loading="lazy" className={cn("cover-frame", className)} />
  );
}

export function BookCard({
  book,
  rating,
  favorite,
  onToggleFavorite,
  compact = false,
  footer,
}: {
  book: Book;
  rating?: number | null;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  compact?: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <div className="group relative">
      <Link to="/book/$bookId" params={{ bookId: book.id }} className="block">
        <div className="relative overflow-hidden rounded-xl transition-transform duration-200 group-hover:-translate-y-1">
          <BookCover book={book} />
        </div>
        <h3
          className={cn(
            "mt-2 line-clamp-2 font-display font-semibold leading-snug",
            compact ? "text-xs" : "text-sm",
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
          <Heart className={cn("h-4 w-4", favorite ? "fill-primary text-primary" : "text-muted-foreground")} />
        </button>
      )}
      {footer}
    </div>
  );
}
