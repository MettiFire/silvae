import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Heart, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { BookCover } from "@/components/BookCard";
import { BookmarkRating } from "@/components/BookmarkRating";
import { ProgressBar } from "@/components/ProgressBar";
import { AddToListMenu } from "@/components/AddToListMenu";
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
  head: () => ({
    meta: [
      { title: "Scheda libro — Paginae" },
      { name: "description", content: "Dettagli del libro, valutazioni della community e recensioni su Paginae." },
      { property: "og:title", content: "Scheda libro — Paginae" },
      { property: "og:description", content: "Dettagli, valutazioni e recensioni del libro." },
    ],
  }),
  component: BookPage,
});

function BookPage() {
  const { bookId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [pageInput, setPageInput] = useState("");
  const [reviewText, setReviewText] = useState("");

  const { data: book, isLoading } = useQuery({ queryKey: ["book", bookId], queryFn: () => getBook(bookId) });
  const { data: item } = useLibraryItem(bookId);
  const save = useSaveToLibrary();
  const update = useUpdateItem();

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, body, rating, created_at, user_id, profiles:profiles!inner(username, display_name, avatar_url)")
        .eq("book_id", bookId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: communityRating } = useQuery({
    queryKey: ["community-rating", bookId],
    queryFn: async () => {
      const { data, error } = await supabase.from("library_items").select("rating").eq("book_id", bookId).not("rating", "is", null);
      if (error) throw error;
      const values = (data ?? []).map((r) => Number(r.rating));
      if (!values.length) return null;
      return values.reduce((a, b) => a + b, 0) / values.length;
    },
  });

  useEffect(() => {
    if (item) setPageInput(String(item.current_page));
  }, [item?.id]);

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
      { onSuccess: () => toast.success(`Spostato in "${STATUS_LABEL[status]}"`) },
    );
  };

  const saveProgress = () => {
    if (!item) return;
    const page = Math.max(0, Math.min(Number(pageInput) || 0, totalPages || Number(pageInput) || 0));
    const done = totalPages > 0 && page >= totalPages;
    update.mutate({
      id: item.id,
      patch: {
        current_page: page,
        status: done ? "read" : "reading",
        finished_at: done ? new Date().toISOString() : null,
      },
      activity: done ? { type: "finished", bookId: book.id, metadata: { title: book.title } } : undefined,
    });
    toast.success(done ? "Complimenti, libro completato!" : "Progresso aggiornato");
  };

  const submitReview = async () => {
    if (!user || !reviewText.trim()) return;
    const { error } = await supabase.from("reviews").insert({
      user_id: user.id,
      book_id: book.id,
      body: reviewText.trim(),
      rating: item?.rating ?? null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("activities").insert({
      user_id: user.id,
      type: "reviewed",
      book_id: book.id,
      metadata: { title: book.title },
    });
    setReviewText("");
    void qc.invalidateQueries({ queryKey: ["reviews", bookId] });
    void qc.invalidateQueries({ queryKey: ["activities"] });
    toast.success("Recensione pubblicata");
  };

  return (
    <AppShell>
      <div className="grid gap-8 md:grid-cols-[260px_1fr]">
        <div>
          <BookCover book={book} />
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
                    onClick={() => update.mutate({ id: item.id, patch: { favorite: !item.favorite } })}
                    className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm"
                  >
                    <Heart className={`h-4 w-4 ${item.favorite ? "fill-primary text-primary" : ""}`} />
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
                        activity: { type: "reread", bookId: book.id, metadata: { title: book.title } },
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
          <h1 className="font-display text-3xl font-extrabold leading-tight">{book.title}</h1>
          <p className="mt-1 text-muted-foreground">
            {book.authors.map((a, idx) => (
              <span key={a}>
                {idx > 0 && ", "}
                <Link to="/author/$author" params={{ author: a }} className="text-primary hover:underline">
                  {a}
                </Link>
              </span>
            ))}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {[book.published_year, book.page_count ? `${book.page_count} pagine` : null].filter(Boolean).join(" · ")}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Community</p>
              <div className="flex items-center gap-2">
                <BookmarkRating value={communityRating ?? book.average_rating ?? 0} readOnly size={16} />
                <span className="text-sm">{(communityRating ?? book.average_rating ?? 0).toFixed(1)}</span>
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

          {book.categories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {book.categories.map((c) => (
                <span key={c} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                  {c}
                </span>
              ))}
            </div>
          )}

          {item && (item.status === "reading" || item.current_page > 0) && (
            <div className="mt-6 rounded-xl border border-border bg-card p-4">
              <p className="mb-2 font-display font-semibold">Progresso di lettura</p>
              <ProgressBar current={item.current_page} total={totalPages} />
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
                  className="ml-auto h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
                >
                  Aggiorna
                </button>
              </div>
            </div>
          )}

          {book.description && (
            <div className="mt-6">
              <div
                className={`prose-sm text-sm leading-relaxed text-foreground/90 ${expanded ? "" : "line-clamp-5"}`}
                dangerouslySetInnerHTML={{ __html: book.description }}
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

          <section className="mt-10">
            <h2 className="font-display text-xl font-bold">Recensioni</h2>
            {user && (
              <div className="mt-3">
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={3}
                  placeholder="Scrivi la tua recensione…"
                  aria-label="Testo recensione"
                  className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary/60"
                />
                <button
                  type="button"
                  onClick={submitReview}
                  className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  Pubblica
                </button>
              </div>
            )}
            <div className="mt-5 space-y-4">
              {reviews.length === 0 && <p className="text-sm text-muted-foreground">Ancora nessuna recensione.</p>}
              {reviews.map((r) => {
                const p = r.profiles as unknown as { username: string; display_name: string | null; avatar_url: string | null };
                return (
                  <article key={r.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <Avatar url={p?.avatar_url} name={p?.display_name ?? p?.username ?? "?"} />
                      <div>
                        <Link to="/u/$username" params={{ username: p?.username ?? "" }} className="text-sm font-medium hover:underline">
                          {p?.display_name ?? p?.username}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.created_at as string).toLocaleDateString("it-IT")}
                        </p>
                      </div>
                      {r.rating != null && <BookmarkRating value={Number(r.rating)} readOnly size={14} className="ml-auto" />}
                    </div>
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{r.body as string}</p>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

export function Avatar({ url, name, size = 36 }: { url?: string | null; name: string; size?: number }) {
  if (url) return <img src={url} alt="" style={{ width: size, height: size }} className="rounded-full object-cover" />;
  return (
    <span
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full bg-accent font-display text-xs font-bold uppercase text-accent-foreground"
    >
      {name.slice(0, 2)}
    </span>
  );
}
