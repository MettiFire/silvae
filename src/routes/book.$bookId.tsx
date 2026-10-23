import { pageSeo } from "@/lib/site-seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { requireFragmentUser } from "@/lib/fragments";
import { getProfileMap } from "@/lib/profile-data";
import { Heart, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { canUpdateReading } from "@/lib/reading-dates";
import { ReadingDates } from "@/components/ReadingDates";
import { ReadingProgress } from "@/components/ReadingProgress";
import { RelatedBooks } from "@/components/RelatedBooks";
import { Fragments } from "@/components/Fragments";
import { CoverPicker } from "@/components/CoverPicker";
import { BookCover } from "@/components/BookCard";
import { BookmarkRating } from "@/components/BookmarkRating";
import { ProgressBar } from "@/components/ProgressBar";
import { AddToListMenu } from "@/components/AddToListMenu";
import { descriptionText } from "@/lib/book-metadata";
import { useBookLanguage } from "@/lib/use-book-language";
import { parsePreferences, PREFERENCES_FIELD, showEbookProgress } from "@/lib/reading-preferences";
import { getBook } from "@/lib/books";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  STATUS_LABEL,
  useLibraryItem,
  useSaveToLibrary,
  useUpdateItem,
  type ReadingStatus,
} from "@/lib/library";

export const Route = createFileRoute("/book/$bookId")({
  head: ({ params }) =>
    pageSeo(
      "Scheda libro — Silvae",
      "Consulta descrizione, autore, copertina e valutazioni di un libro e aggiungilo alla tua libreria.",
      `/book/${encodeURIComponent(params.bookId)}`,
      false,
    ),
  component: BookPage,
});

function BookPage() {
  const { bookId } = Route.useParams();
  const { user } = useAuth();
  const preferences = parsePreferences(user?.user_metadata[PREFERENCES_FIELD]);
  const { language, ready: languageReady } = useBookLanguage(preferences?.language);
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [pageInput, setPageInput] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);

  const {
    data: book,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["book", bookId, language ?? "any"],
    queryFn: () => getBook(bookId, language),
    enabled: languageReady,
  });
  const { data: item } = useLibraryItem(bookId);
  const save = useSaveToLibrary();
  const update = useUpdateItem();

  const {
    data: reviews = [],
    isError: reviewsError,
    isPending: reviewsLoading,
  } = useQuery({
    queryKey: ["reviews", bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, body, rating, created_at, user_id")
        .eq("book_id", bookId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const profiles = await getProfileMap((data ?? []).map((r) => r.user_id));
      return (data ?? []).map((r) => ({ ...r, profiles: profiles.get(r.user_id) ?? null }));
    },
  });

  const {
    data: communityRating,
    isLoading: ratingLoading,
    isError: ratingError,
  } = useQuery({
    queryKey: ["community-rating", bookId],
    queryFn: async () => {
      const aggregated = await supabase.rpc("book_community_rating", { p_book_id: bookId });
      if (!aggregated.error) {
        const row = aggregated.data?.[0];
        return row?.ratings_count
          ? { average: Number(row.average_rating), count: Number(row.ratings_count) }
          : null;
      }
      if (!["PGRST202", "42883"].includes(aggregated.error.code)) throw aggregated.error;
      // Keep older deployments usable until the aggregate migration is applied.
      const values: number[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase
          .from("library_items")
          .select("rating")
          .eq("book_id", bookId)
          .eq("status", "read")
          .not("rating", "is", null)
          .order("id")
          .range(offset, offset + 499);
        if (error) throw error;
        values.push(
          ...(data ?? [])
            .map((r) => Number(r.rating))
            .filter((r) => Number.isFinite(r) && r >= 0 && r <= 5),
        );
        if ((data?.length ?? 0) < 500) break;
      }
      return values.length
        ? { average: values.reduce((a, b) => a + b, 0) / values.length, count: values.length }
        : null;
    },
  });

  const savedPage = item?.current_page;
  useEffect(() => {
    if (savedPage != null) setPageInput(String(savedPage));
  }, [item?.id, savedPage]);

  if (isError)
    return (
      <AppShell>
        <p role="alert">
          Impossibile caricare il libro.{" "}
          <button onClick={() => void refetch()} className="text-primary">
            Riprova
          </button>
        </p>
      </AppShell>
    );
  if (isLoading || !book) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Caricamento…</p>
      </AppShell>
    );
  }

  const totalPages = item?.total_pages ?? book.page_count ?? 0;

  const setStatus = (status: ReadingStatus) => {
    save.mutate(
      { book, status },
      {
        onSuccess: () => toast.success(`Spostato in "${STATUS_LABEL[status]}"`),
        onError: () => toast.error("Impossibile salvare il libro. Riprova."),
      },
    );
  };

  const saveProgress = () => {
    if (!item || !canUpdateReading(item) || update.isPending) return;
    const page = Math.max(
      0,
      Math.min(Number(pageInput) || 0, totalPages || Number(pageInput) || 0),
    );
    const done = totalPages > 0 && page >= totalPages;
    update.mutate(
      {
        id: item.id,
        patch: {
          current_page: page,
          started_at: item.started_at ?? new Date().toISOString(),
          status: done ? "read" : "reading",
          finished_at: done ? new Date().toISOString() : null,
        },
        activity: done
          ? { type: "finished", bookId: book.id, metadata: { title: book.title } }
          : undefined,
      },
      {
        onSuccess: () =>
          toast.success(done ? "Complimenti, libro completato!" : "Progresso aggiornato"),
      },
    );
  };

  const submitReview = async () => {
    if (!user || !reviewText.trim() || reviewBusy) return;
    setReviewBusy(true);
    try {
      await requireFragmentUser(supabase, user.id);
      const { error } = await supabase.from("reviews").insert({
        user_id: user.id,
        book_id: book.id,
        body: reviewText.trim(),
        rating: item?.rating ?? null,
      });
      if (error) throw error;
      await supabase.from("activities").insert({
        user_id: user.id,
        type: "reviewed",
        book_id: book.id,
        metadata: { title: book.title },
      });
      setReviewText("");
      await qc.invalidateQueries({ queryKey: ["reviews", bookId] });
      void qc.invalidateQueries({ queryKey: ["activities"] });
      toast.success("Recensione pubblicata");
    } catch {
      toast.error("Recensione non pubblicata. Controlla la connessione e riprova.");
    } finally {
      setReviewBusy(false);
    }
  };

  return (
    <AppShell>
      {item?.needs_review && (
        <div className="mb-5 rounded-xl border border-border bg-accent p-4 text-sm">
          Questo libro è stato conservato dai dati del CSV perché non c’era una corrispondenza certa
          nel catalogo. Controlla titolo e autore; puoi scegliere una copertina qui sotto.
          <button
            disabled={update.isPending}
            className="ml-2 font-medium text-primary"
            onClick={() => update.mutate({ id: item.id, patch: { needs_review: false } }, {})}
          >
            Conferma dati corretti
          </button>
        </div>
      )}
      <div className="book-detail-layout grid gap-8 md:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
        <div>
          <BookCover
            book={
              item?.custom_cover_url
                ? {
                    ...book,
                    cover_url: item.custom_cover_url,
                    custom_cover_url: item.custom_cover_url,
                  }
                : book
            }
            priority
          />
          {item && (
            <CoverPicker
              book={
                item.custom_cover_url
                  ? {
                      ...book,
                      cover_url: item.custom_cover_url,
                      custom_cover_url: item.custom_cover_url,
                    }
                  : book
              }
            />
          )}
          {user && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(STATUS_LABEL) as ReadingStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      item?.status === s
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:bg-accent"
                    }`}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
              <AddToListMenu book={book} />
              {item && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-pressed={item.favorite}
                    onClick={() =>
                      update.mutate({ id: item.id, patch: { favorite: !item.favorite } })
                    }
                    className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm"
                  >
                    <Heart
                      className={`h-4 w-4 ${item.favorite ? "fill-primary text-primary" : ""}`}
                    />
                    Preferito
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      update.mutate({
                        id: item.id,
                        patch: {
                          reread_count: item.reread_count + 1,
                          last_reread_at: new Date().toISOString(),
                          status: "read",
                          finished_at: new Date().toISOString(),
                        },
                        activity: {
                          type: "reread",
                          bookId: book.id,
                          metadata: { title: book.title },
                        },
                      })
                    }
                    className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm"
                  >
                    <RotateCcw className="h-4 w-4" /> Riletto ({item.reread_count})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <p className="eyebrow mb-4">Dalla biblioteca</p>
          <h1 className="font-display text-4xl font-normal leading-tight tracking-tight lg:text-5xl">
            {book.title}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {book.authors.map((a, idx) => (
              <span key={a}>
                {idx > 0 && ", "}
                <Link
                  to="/author/$author"
                  params={{ author: a }}
                  className="text-primary hover:underline"
                >
                  {a}
                </Link>
              </span>
            ))}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {[book.published_year, book.page_count ? `${book.page_count} pagine` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div>
              <p className="text-xs text-muted-foreground">
                Chi l’ha letto {communityRating ? `· ${communityRating.count} voti` : ""}
              </p>
              <div className="flex items-center gap-2">
                <BookmarkRating value={communityRating?.average ?? null} readOnly size={16} />
                <span className="text-sm">
                  {communityRating
                    ? communityRating.average.toFixed(1)
                    : ratingError
                      ? "Valutazioni non disponibili"
                      : ratingLoading
                        ? "Caricamento voti…"
                        : "Ancora nessun voto"}
                </span>
              </div>
            </div>
            {item && (
              <div>
                <p className="text-xs text-muted-foreground">Il tuo voto</p>
                <BookmarkRating
                  value={item.rating != null ? Number(item.rating) : null}
                  size={18}
                  onChange={(v) => update.mutate({ id: item.id, patch: { rating: v } })}
                />
              </div>
            )}
          </div>

          {book.average_rating != null && (
            <p className="mt-3 text-xs text-muted-foreground">
              Voto del catalogo esterno: {book.average_rating.toFixed(1)} / 5
              {book.ratings_count ? ` · ${book.ratings_count} valutazioni` : ""}
            </p>
          )}

          {book.categories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {book.categories.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          {item && canUpdateReading(item) && (
            <div className="mt-6 rounded-xl border border-border bg-card p-4">
              <p className="mb-2 font-display font-semibold">Progresso di lettura</p>
              <ProgressBar
                current={item.current_page}
                total={totalPages}
                percentage={
                  showEbookProgress(user?.user_metadata[PREFERENCES_FIELD])
                    ? item.progress_percent
                    : null
                }
              />
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sono a pagina</span>
                <input
                  type="number"
                  min={0}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  aria-label="Pagina attuale"
                  className="h-9 w-24 rounded-lg border border-border bg-background px-2 text-sm"
                />
                <span className="text-sm text-muted-foreground">di {totalPages || "?"}</span>
                <button
                  type="button"
                  onClick={saveProgress}
                  disabled={update.isPending}
                  className="ml-auto h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
                >
                  Aggiorna
                </button>
              </div>
            </div>
          )}

          {item && canUpdateReading(item) && (
            <ReadingProgress
              key={`${item.id}:${item.reading_session_id}:${item.progress_updated_at}`}
              item={item}
            />
          )}

          {item && (
            <ReadingDates key={`${item.id}:${item.started_at}:${item.finished_at}`} item={item} />
          )}

          <h2 className="mt-6 font-display text-lg font-semibold">Descrizione del libro</h2>
          {!book.description && (
            <p className="mt-2 text-sm text-muted-foreground">
              Nessuna descrizione disponibile nei cataloghi consultati per questo libro.
            </p>
          )}
          {book.description && (
            <div className="mt-6">
              <div
                className={`whitespace-pre-line prose-sm text-sm leading-relaxed text-foreground/90 ${expanded ? "" : "line-clamp-5"}`}
                children={descriptionText(book.description)}
              />
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded((v) => !v)}
                className="mt-2 text-sm font-medium text-primary"
              >
                {expanded ? "Mostra meno" : "Mostra altro"}
              </button>
            </div>
          )}

          <Fragments book={book} />

          <section className="mt-10">
            <h2 className="font-display text-xl font-bold">Recensioni recenti</h2>
            {user && (
              <div className="mt-3">
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={3}
                  maxLength={10000}
                  disabled={reviewBusy}
                  placeholder="Scrivi la tua recensione…"
                  aria-label="Testo recensione"
                  className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary/60"
                />
                <button
                  type="button"
                  onClick={submitReview}
                  disabled={reviewBusy || !reviewText.trim()}
                  className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  {reviewBusy ? "Pubblicazione…" : "Pubblica"}
                </button>
              </div>
            )}
            <div className="mt-5 space-y-4">
              {reviewsError && (
                <p role="alert" className="text-sm text-destructive">
                  Le recensioni non sono disponibili. Riprova più tardi.
                </p>
              )}
              {reviewsLoading && (
                <p role="status" className="text-sm text-muted-foreground">
                  Caricamento recensioni…
                </p>
              )}
              {!reviewsLoading && !reviewsError && reviews.length === 0 && (
                <p className="text-sm text-muted-foreground">Ancora nessuna recensione.</p>
              )}
              {reviews.map((r) => {
                const p = r.profiles as unknown as {
                  username: string;
                  display_name: string | null;
                  avatar_url: string | null;
                };
                return (
                  <article key={r.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <Avatar url={p?.avatar_url} name={p?.display_name ?? p?.username ?? "?"} />
                      <div>
                        <Link
                          to="/u/$username"
                          params={{ username: p?.username ?? "" }}
                          className="text-sm font-medium hover:underline"
                        >
                          {p?.display_name ?? p?.username}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.created_at as string).toLocaleDateString("it-IT")}
                        </p>
                      </div>
                      {r.rating != null && (
                        <BookmarkRating
                          value={Number(r.rating)}
                          readOnly
                          size={14}
                          className="ml-auto"
                        />
                      )}
                    </div>
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">
                      {r.body as string}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
      <RelatedBooks key={book.id} book={book} />
    </AppShell>
  );
}

export function Avatar({
  url,
  name,
  size = 36,
}: {
  url?: string | null;
  name: string;
  size?: number;
}) {
  if (url)
    return (
      <img
        src={url}
        alt={`Foto di ${name}`}
        loading="lazy"
        decoding="async"
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        style={{ width: size, height: size }}
        className="rounded-full object-cover"
      />
    );
  return (
    <span
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full bg-accent font-display text-xs font-bold uppercase text-accent-foreground"
    >
      {name.slice(0, 2)}
    </span>
  );
}
