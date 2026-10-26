import { useRememberedState } from "@/lib/use-remembered-state";
import { UiDate } from "@/lib/ui-language-context";
import { UiText, UiElement } from "@/lib/ui-language-context";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Pencil, Trash2, Quote, RotateCcw } from "lucide-react";
import { toast } from "@/lib/localized-toast";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import type { Book } from "@/lib/books";
import { useLibrary } from "@/lib/library";
import {
  fragmentError,
  moveFragmentToTrash,
  FRAGMENT_SOURCES,
  type Fragment,
  type FragmentSource,
} from "@/lib/fragments";
import { FragmentVisibility } from "./FragmentVisibility";
import { FragmentText } from "./FragmentText";
import { FragmentEditor } from "./FragmentEditor";
import { FragmentImport } from "./FragmentImport";
import { BookCover } from "./BookCard";
export type WithBook = Fragment & { books: Book | null };
export function FragmentCard({
  fragment: f,
  onEdit,
  onTrash,
  onFavorite,
  busy = false,
  readOnly = false,
}: {
  fragment: WithBook;
  onEdit: () => void;
  onTrash: () => void;
  onFavorite: () => void;
  busy?: boolean;
  readOnly?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-start gap-3">
        {f.books && (
          <Link to="/book/$bookId" params={{ bookId: f.book_id }} className="w-10 shrink-0">
            <BookCover book={f.books} />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <Link
            to="/book/$bookId"
            params={{ bookId: f.book_id }}
            className="font-display text-sm font-semibold hover:underline"
          >
            {f.books?.title ?? "Libro"}
          </Link>
          <p className="text-xs text-muted-foreground">{f.books?.authors.join(", ")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            <UiText text={f.kind === "note" ? "Nota personale" : "Citazione"} /> ·{" "}
            {FRAGMENT_SOURCES[f.source as FragmentSource] ?? f.source}
            {f.position ? ` · ${f.position}` : ""}
          </p>
        </div>
        {!readOnly && (
          <UiElement
            as="button"
            disabled={busy || !!f.deleted_at}
            aria-label={
              f.favorite ? "Rimuovi frammento dai preferiti" : "Aggiungi frammento ai preferiti"
            }
            aria-pressed={f.favorite}
            onClick={onFavorite}
            className="rounded-lg p-1 text-primary disabled:opacity-40"
          >
            <Heart className={`h-4 w-4 ${f.favorite ? "fill-current" : ""}`} />
          </UiElement>
        )}
      </div>
      <blockquote className="whitespace-pre-wrap break-words border-l-2 border-primary/40 pl-4 font-display text-base leading-relaxed">
        <FragmentText text={f.quote} />
      </blockquote>
      {f.note && (
        <p className="mt-4 whitespace-pre-wrap break-words text-sm text-muted-foreground">
          <FragmentText text={f.note} />
        </p>
      )}
      {!!f.tags.length && (
        <div className="mt-3 flex flex-wrap gap-2">
          {f.tags.map((t) => (
            <span key={t} className="rounded-full bg-accent px-2 py-1 text-xs">
              #{t}
            </span>
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <time className="text-xs text-muted-foreground" dateTime={f.highlighted_at ?? f.created_at}>
          <UiDate value={new Date(f.highlighted_at ?? f.created_at)} />
        </time>
        {!readOnly && (
          <div className="flex gap-3">
            {!f.deleted_at && (
              <button
                disabled={busy}
                onClick={onEdit}
                className="inline-flex items-center gap-1 text-xs"
              >
                <Pencil className="h-3 w-3" />
                <UiText text="Modifica" />
              </button>
            )}
            <button
              disabled={busy}
              onClick={onTrash}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground"
            >
              {f.deleted_at ? (
                <>
                  <RotateCcw className="h-3 w-3" />
                  <UiText text="Ripristina" />
                </>
              ) : (
                <>
                  <Trash2 className="h-3 w-3" />
                  <UiText text="Sposta nel cestino" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
export function Fragments({ book }: { book?: Book | undefined }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const library = useLibrary(user?.id);
  const [editor, setEditor] = useState<Fragment | null | false>(false);
  const [importing, setImporting] = useState(false);
  const [page, setPage] = useRememberedState<number>("fragments.page", 0);
  const [search, setSearch] = useRememberedState<string>("fragments.search", "");
  const [bookId, setBookId] = useRememberedState<string>("fragments.bookId", "");
  const [source, setSource] = useRememberedState<string>("fragments.source", "");
  const [tag, setTag] = useRememberedState<string>("fragments.tag", "");
  const [favorite, setFavorite] = useRememberedState<boolean>("fragments.favorite", false);
  const [trash, setTrash] = useRememberedState<boolean>("fragments.trash", false);
  const [order, setOrder] = useRememberedState<string>("fragments.order", "new");
  const [busy, setBusy] = useState<string | null>(null);
  const bookChoices = useQuery({
    queryKey: ["fragment-books", user?.id],
    enabled: !!user && !book,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fragment_books");
      if (error) throw error;
      return data;
    },
  });
  const list = useQuery({
    queryKey: [
      "fragments",
      user?.id,
      book?.id ?? bookId,
      search,
      source,
      tag,
      favorite,
      trash,
      order,
      page,
    ],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from("fragments")
        .select("*, books(*)", { count: "exact" })
        .eq("user_id", user!.id);
      if (trash) query = query.not("deleted_at", "is", null);
      else query = query.is("deleted_at", null);
      if (book?.id || bookId) query = query.eq("book_id", book?.id ?? bookId);
      if (source) query = query.eq("source", source);
      if (tag.trim()) query = query.contains("tags", [tag.trim()]);
      if (favorite) query = query.eq("favorite", true);
      if (search.trim())
        query = query.ilike("quote", `%${search.trim().replace(/[\\%_]/g, "\\$&")}%`);
      const { data, error, count } = await query
        .order("created_at", { ascending: order === "old" })
        .order("id")
        .range(page * 24, page * 24 + 23);
      if (error) throw error;
      return { rows: (data ?? []) as unknown as WithBook[], count: count ?? 0 };
    },
  });
  // Reuse the library query so cover changes invalidate every fragment view too.
  const personalCovers = new Map(
    library.data?.map((item) => [item.book_id, item.custom_cover_url]),
  );
  const rows = list.data?.rows.map((fragment) => {
    const cover = personalCovers.get(fragment.book_id);
    return cover && fragment.books
      ? { ...fragment, books: { ...fragment.books, cover_url: cover, custom_cover_url: cover } }
      : fragment;
  });
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["fragments"] });
    await qc.invalidateQueries({ queryKey: ["fragment-books"] });
    await qc.invalidateQueries({ queryKey: ["profile-fragments"] });
  };
  const move = async (f: Fragment) => {
    if (!user || busy) return;
    setBusy(f.id);
    try {
      await moveFragmentToTrash(supabase, user.id, f.id, !!f.deleted_at);
      await refresh();
      toast.success(f.deleted_at ? "Frammento ripristinato" : "Frammento nel cestino");
    } catch (e) {
      toast.error(fragmentError(e));
    } finally {
      setBusy(null);
    }
  };
  const toggle = async (f: Fragment) => {
    if (!user || busy) return;
    setBusy(f.id);
    try {
      const { error } = await supabase
        .from("fragments")
        .update({ favorite: !f.favorite })
        .eq("user_id", user.id)
        .eq("id", f.id);
      if (error) throw error;
      await refresh();
    } catch (e) {
      toast.error(fragmentError(e));
    } finally {
      setBusy(null);
    }
  };
  const filter = (action: () => void) => {
    action();
    setPage(0);
  };
  if (!user)
    return (
      <section className="mt-10">
        <h2 className="font-display text-xl font-bold">
          <UiText text="Frammenti" />
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          <Link to="/auth" className="text-primary">
            <UiText text="Accedi" />
          </Link>{" "}
          <UiText text="per conservare le tue frasi e note da questo libro." />
        </p>
      </section>
    );
  return (
    <section className={book ? "mt-10" : ""}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold">
            <Quote className="h-5 w-5 text-primary" />
            <UiText text={book ? "I tuoi frammenti" : "Le parole che vuoi ritrovare"} />
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <UiText text="Citazioni, sottolineature e note personali. Scegli con chi condividerle." />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setEditor(null)}
            className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
          >
            <UiText text="Aggiungi frase" />
          </button>
          {!book && (
            <button
              onClick={() => setImporting((v) => !v)}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <UiText text="Importa sottolineature" />
            </button>
          )}
          {book && (
            <Link to="/fragments" className="rounded-lg border px-3 py-2 text-sm">
              <UiText text="Tutti i frammenti" />
            </Link>
          )}
        </div>
      </div>
      {!book && <FragmentVisibility key={user.id} />}
      {importing && <FragmentImport close={() => setImporting(false)} />}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <UiElement
          as="input"
          aria-label="Cerca nei frammenti"
          placeholder="Cerca nel testo delle frasi…"
          value={search}
          onChange={(e) => filter(() => setSearch(e.target.value))}
          className="min-w-0 flex-1 rounded-lg border bg-background p-2 text-sm"
        />
        {!book && (
          <UiElement
            as="select"
            aria-label="Filtra frammenti per libro"
            value={bookId}
            onChange={(e) => filter(() => setBookId(e.target.value))}
            className="max-w-full rounded-lg border bg-background p-2 text-sm"
          >
            <option value="">
              <UiText text="Tutti i libri" />
            </option>
            {bookChoices.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title} · {b.authors.join(", ")}
              </option>
            ))}
          </UiElement>
        )}
        <UiElement
          as="select"
          aria-label="Origine dei frammenti"
          value={source}
          onChange={(e) => filter(() => setSource(e.target.value))}
          className="rounded-lg border bg-background p-2 text-sm"
        >
          <option value="">
            <UiText text="Tutte le origini" />
          </option>
          {Object.entries(FRAGMENT_SOURCES).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </UiElement>
        <UiElement
          as="input"
          aria-label="Filtra per tag"
          placeholder="Tag esatto"
          value={tag}
          onChange={(e) => filter(() => setTag(e.target.value))}
          className="w-32 rounded-lg border bg-background p-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={favorite}
            onChange={(e) => filter(() => setFavorite(e.target.checked))}
          />
          <UiText text="Preferiti" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={trash}
            onChange={(e) => filter(() => setTrash(e.target.checked))}
          />
          <UiText text="Cestino" />
        </label>
        <UiElement
          as="select"
          aria-label="Ordina frammenti"
          value={order}
          onChange={(e) => filter(() => setOrder(e.target.value))}
          className="rounded-lg border bg-background p-2 text-sm"
        >
          <option value="new">
            <UiText text="Più recenti" />
          </option>
          <option value="old">
            <UiText text="Meno recenti" />
          </option>
        </UiElement>
      </div>
      {list.isFetching && (
        <p role="status" className="mb-4 text-sm text-muted-foreground">
          <UiText text="Caricamento dei frammenti…" />
        </p>
      )}
      {list.isError && (
        <p role="alert" className="mb-4 text-sm">
          {fragmentError(list.error)}{" "}
          <button onClick={() => void list.refetch()} className="text-primary">
            <UiText text="Riprova" />
          </button>
        </p>
      )}
      {!list.isFetching && !list.isError && !list.data?.rows.length && (
        <div className="rounded-2xl border border-dashed p-8 text-center">
          <Quote className="mx-auto mb-3 h-7 w-7 text-primary" />
          <p className="font-display text-lg">
            <UiText
              text={trash ? "Il cestino è vuoto" : "Qui troverai le frasi che ti restano dentro"}
            />
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            <UiText
              text={
                search || bookId || source || tag || favorite
                  ? "Prova a cambiare i filtri."
                  : "Aggiungi una citazione dalla scheda di un libro oppure importa le tue sottolineature."
              }
            />
          </p>
        </div>
      )}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {rows?.map((f) => (
          <FragmentCard
            key={f.id}
            fragment={f}
            onEdit={() => setEditor(f)}
            onTrash={() => void move(f)}
            onFavorite={() => void toggle(f)}
            busy={!!busy}
          />
        ))}
      </div>
      {!!list.data?.count && (
        <div className="mt-6 flex items-center gap-3">
          <button
            disabled={!page || list.isFetching}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border px-3 py-1 text-sm disabled:opacity-40"
          >
            <UiText text="Precedenti" />
          </button>
          <span className="text-sm">
            <UiText text="Pagina " />
            {page + 1}
            <UiText text=" di " />
            {Math.ceil(list.data.count / 24)} · {list.data.count}
            <UiText text=" frammenti" />
          </span>
          <button
            disabled={list.isFetching || (page + 1) * 24 >= list.data.count}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border px-3 py-1 text-sm disabled:opacity-40"
          >
            <UiText text="Successivi" />
          </button>
        </div>
      )}
      {editor !== false && (
        <FragmentEditor
          book={editor ? (rows?.find((f) => f.id === editor.id)?.books ?? book) : book}
          original={editor ?? undefined}
          close={() => setEditor(false)}
        />
      )}
    </section>
  );
}
