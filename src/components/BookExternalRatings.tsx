import { useQuery } from "@tanstack/react-query";
import { bookCriticRating } from "@/lib/critic-rating.functions";
import type { Book } from "@/lib/books";

export function BookExternalRatings({ book }: { book: Book }) {
  const { data: criticRating } = useQuery({
    queryKey: ["critic-rating", book.id, book.isbns],
    enabled: !!book.isbns?.length,
    queryFn: () => bookCriticRating({ data: { isbns: (book.isbns ?? []).slice(0, 100) } }),
    staleTime: 86400000,
    retry: false,
  });
  return (
    (criticRating || book.average_rating != null) && (
      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-4 border-t border-border pt-4">
        {criticRating && (
          <div>
            <a
              href={criticRating.source}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground underline underline-offset-4"
            >
              Critica · Book Marks ↗
            </a>
            <p className="text-xl tabular-nums">
              {criticRating.favorablePercent}
              <span className="text-sm text-muted-foreground">% favorevoli</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {criticRating.count} recensioni · calcolo Silvae
            </p>
            <details className="mt-1 max-w-xs text-xs text-muted-foreground">
              <summary className="cursor-pointer">Come si calcola</summary>
              <p className="mt-1">
                Percentuale di recensioni Rave o Positive sul totale raccolto da Book Marks. È un
                calcolo di Silvae, distinto dal giudizio testuale originale di Book Marks e dalla
                media dei lettori.
              </p>
            </details>
          </div>
        )}
        {book.average_rating != null && Number.isFinite(book.average_rating) && (
          <div>
            <p className="text-xs text-muted-foreground">
              Lettori · {book.rating_source ?? "Catalogo esterno"}
            </p>
            <p className="text-xl tabular-nums">
              {book.average_rating.toFixed(1)}
              <span className="text-sm text-muted-foreground"> / 5</span>
            </p>
            {book.ratings_count != null && (
              <p className="text-xs text-muted-foreground">{book.ratings_count} valutazioni</p>
            )}
          </div>
        )}
      </div>
    )
  );
}
