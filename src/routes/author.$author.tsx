import { pageSeo } from "@/lib/site-seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bookmark, Check } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { BookCard } from "@/components/BookCard";
import { groupAuthors, authorMatchesQuery } from "@/lib/author-search";
import { useBookLanguage } from "@/lib/use-book-language";
import { BOOK_LANGUAGES } from "@/lib/book-language";
import { parsePreferences, PREFERENCES_FIELD } from "@/lib/reading-preferences";
import { defaultAuthor, findAuthors, getAuthor, getAuthorBooks } from "@/lib/authors";
import { AUTHORS_FIELD, parseFollowedAuthors, changeFollowedAuthor } from "@/lib/followed-authors";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { supabase } from "@/integrations/supabase/client";
import { hasReadBook } from "@/lib/library-order";

export const Route = createFileRoute("/author/$author")({
  validateSearch: (s: Record<string, unknown>): { olid?: string } =>
    typeof s["olid"] === "string" && /^OL\d+A$/.test(s["olid"]) ? { olid: s["olid"] } : {},
  head: ({ params }) =>
    pageSeo(
      `${params.author} — Autore su Silvae`,
      `Biografia, bibliografia e nuove letture di ${params.author}. Segui l’autore su Silvae.`,
      `/author/${encodeURIComponent(params.author)}`,
      false,
    ),
  component: AuthorPage,
});
function AuthorPage() {
  const { author } = Route.useParams();
  const { olid } = Route.useSearch();
  return <AuthorContent key={`${author}:${olid ?? ""}`} name={author} selectedId={olid} />;
}
function AuthorContent({ name, selectedId }: { name: string; selectedId: string | undefined }) {
  const { user } = useAuth();
  const preferences = parsePreferences(user?.user_metadata[PREFERENCES_FIELD]);
  const { language, ready: languageReady } = useBookLanguage(preferences?.language);
  const [allLanguages, setAllLanguages] = useState(false);
  const { data: library = [] } = useLibrary(user?.id);
  const [chosen, setChosen] = useState<string | null>(selectedId ?? null);
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<"new" | "title" | "popular">("popular");
  const [busy, setBusy] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const candidates = useQuery({
    queryKey: ["author-candidates-v2", name, language ?? "any"],
    queryFn: ({ signal }) => findAuthors(name, language, signal),
    staleTime: 3600000,
    enabled: languageReady,
  });
  const groups = groupAuthors(candidates.data ?? []).filter((author) =>
    authorMatchesQuery(author, name),
  );
  const chosenGroup = groups.find(
    (author) => author.id === chosen || author.ids?.includes(chosen ?? ""),
  );
  const id = chosenGroup?.id ?? chosen ?? defaultAuthor(groups, name);
  const groupIds =
    chosenGroup?.ids ?? groups.find((author) => author.id === id)?.ids ?? (id ? [id] : []);
  const details = useQuery({
    queryKey: ["author-details", id, language ?? "any", name],
    queryFn: () => getAuthor(id!, name, language),
    enabled: !!id,
    staleTime: 3600000,
  });
  const catalogue = useQuery({
    queryKey: [
      "author-books-v2",
      id,
      groupIds.join("|"),
      page,
      sort,
      allLanguages ? "any" : (language ?? "any"),
      details.data?.name,
    ],
    queryFn: () =>
      getAuthorBooks(id!, page, sort, {
        language: allLanguages ? undefined : language,
        displayName: details.data?.name,
        authorIds: groupIds,
      }),
    enabled: !!id && languageReady && !!details.data,
    staleTime: 300000,
  });
  const followed = parseFollowedAuthors(user?.user_metadata[AUTHORS_FIELD]).some((a) =>
    groupIds.includes(a.id),
  );
  const toggle = async () => {
    if (!user || !id || !details.data || busy) return;
    setBusy(true);
    try {
      await changeFollowedAuthor(
        supabase,
        user.id,
        { id, name: details.data.name, ids: groupIds },
        !followed,
      );
      toast.success(
        followed ? "Autore rimosso dai seguiti" : "Autore salvato. Lo ritrovi nel profilo.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Salvataggio non riuscito.");
    } finally {
      setBusy(false);
    }
  };
  const error = candidates.error || details.error || catalogue.error;
  const data = details.data;
  const books = catalogue.data?.books ?? [];
  return (
    <AppShell>
      <PageHeader
        title={data?.name ?? name}
        subtitle="La storia, i libri e le opere più recenti"
        action={
          data &&
          (user ? (
            <button
              disabled={busy}
              onClick={() => void toggle()}
              className="flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm text-primary disabled:opacity-50"
            >
              {followed ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              {busy ? "Salvataggio…" : followed ? "Segui già · Smetti di seguire" : "Segui autore"}
            </button>
          ) : (
            <Link to="/auth" className="text-sm text-primary">
              Accedi per seguire l’autore
            </Link>
          ))
        }
      />
      {groups.length > 1 && (
        <label className="mb-6 flex max-w-xl flex-col gap-2 text-sm">
          {id ? "Non è la persona che cercavi?" : "Scegli l’autore: ci possono essere omonimi."}
          <select
            value={id ?? ""}
            onChange={(e) => {
              setChosen(e.target.value || null);
              setPage(0);
              setPhotoFailed(false);
            }}
            className="rounded-lg border border-border bg-background p-2"
          >
            <option value="">Seleziona un autore</option>
            {groups.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.birth ? ` · ${a.birth}` : ""}
                {a.topWork ? ` · ${a.topWork}` : ""}
              </option>
            ))}
          </select>
        </label>
      )}
      {groups.length === 1 && !id && (
        <button
          onClick={() => setChosen(groups[0]!.id)}
          className="mb-6 rounded-lg border p-3 text-sm"
        >
          Intendevi {groups[0]!.name}? · {groups[0]!.topWork}
        </button>
      )}
      {error && (
        <p role="alert" className="mb-6 text-sm">
          Non è stato possibile caricare tutti i dati.{" "}
          <button
            className="text-primary"
            onClick={() => {
              if (candidates.isError) void candidates.refetch();
              if (details.isError) void details.refetch();
              if (catalogue.isError) void catalogue.refetch();
            }}
          >
            Riprova
          </button>
        </p>
      )}
      {candidates.isLoading && !selectedId && <p>Ricerca dell’autore…</p>}
      {!candidates.isLoading && groups.length === 0 && !selectedId && (
        <p>
          Nessun autore identificato. Prova a cercare un altro suo libro o una diversa forma del
          nome.
        </p>
      )}
      {data && (
        <section className="mb-8 flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 sm:flex-row">
          {data.photo && !photoFailed && (
            <img
              src={data.photo}
              width={112}
              height={144}
              decoding="async"
              referrerPolicy="no-referrer"
              alt={`Ritratto di ${data.name}`}
              onError={() => setPhotoFailed(true)}
              className="h-36 w-28 shrink-0 rounded-xl object-cover"
            />
          )}
          <div>
            <p className="mb-3 text-sm text-muted-foreground">
              {data.birth ? `Nascita: ${data.birth}` : ""}
              {data.death ? ` · Morte: ${data.death}` : ""}
            </p>
            <p className="whitespace-pre-line text-sm leading-relaxed">
              {data.bio ?? "Biografia non ancora disponibile nel catalogo."}
            </p>
            <a
              href={data.source}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-xs text-primary"
            >
              Dati e bibliografia da Open Library ↗
            </a>
          </div>
        </section>
      )}
      {id && (
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold">Bibliografia disponibile</h2>
              <p className="text-sm text-muted-foreground">
                {catalogue.data?.total ?? "…"} opere nel catalogo. Le date indicano la prima
                pubblicazione nota.
              </p>
            </div>
            <label className="text-sm">
              Ordina{" "}
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as typeof sort);
                  setPage(0);
                }}
                className="ml-2 rounded-lg border border-border bg-background p-2"
              >
                <option value="new">Uscite più recenti</option>
                <option value="popular">Più popolari</option>
                <option value="title">Titolo A–Z</option>
              </select>
            </label>
          </div>
          {sort === "popular" && (
            <p className="mb-2 text-xs text-muted-foreground">
              Popolarità basata sulle aggiunte alle librerie su Open Library.
            </p>
          )}
          {language && (
            <label className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={allLanguages}
                onChange={(event) => {
                  setAllLanguages(event.target.checked);
                  setPage(0);
                }}
              />
              Mostra anche opere senza edizioni in{" "}
              {BOOK_LANGUAGES.find((item) => item.code === language)?.label.toLowerCase()}
            </label>
          )}
          <p className="mb-5 text-xs text-muted-foreground">
            {language && !allLanguages
              ? "Titoli delle edizioni nella lingua scelta nelle impostazioni. "
              : "Titoli delle edizioni disponibili; alcune opere possono avere solo il titolo originale. "}
            Il catalogo può essere incompleto; date di traduzioni e ristampe possono differire. I
            libri futuri compaiono solo se già catalogati.
          </p>
          {catalogue.isFetching && (
            <p role="status" className="mb-4 text-sm">
              Caricamento dei libri…
            </p>
          )}
          <div className="book-grid grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {books.map((b) => (
              <div key={b.id} className="relative">
                <BookCard book={b} />
                {hasReadBook(b, library) && (
                  <span
                    aria-label="Già letto"
                    className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-full bg-emerald-700 px-2 py-1 text-[10px] font-semibold text-white shadow-sm"
                  >
                    <Check aria-hidden="true" className="h-3 w-3" />
                    Letto
                  </span>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {b.published_year ?? "Anno non disponibile"}
                  {sort === "popular" && b.reading_count != null
                    ? ` · ${b.reading_count.toLocaleString("it-IT")} aggiunte`
                    : ""}
                </p>
              </div>
            ))}
          </div>
          {!catalogue.isFetching && !catalogue.isError && !books.length && (
            <p>Nessuna opera trovata in questa pagina.</p>
          )}
          <div className="mt-6 flex items-center gap-4">
            <button
              disabled={!page || catalogue.isFetching}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
            >
              Precedente
            </button>
            <span className="text-sm">Pagina {page + 1}</span>
            <button
              disabled={
                catalogue.isFetching || !catalogue.data || (page + 1) * 24 >= catalogue.data.total
              }
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
            >
              Successiva
            </button>
          </div>
        </section>
      )}
    </AppShell>
  );
}
