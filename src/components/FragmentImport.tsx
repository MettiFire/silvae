import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { supabase } from "@/integrations/supabase/client";
import {
  prepareFragmentImport,
  fragmentBookGroup,
  type ImportedFragment,
} from "@/lib/fragment-import";
import { searchBooks, cacheBook, type Book } from "@/lib/books";
import { associateFragmentBooks } from "@/lib/fragment-book-association";
import { resolveRecommendationWork } from "@/lib/work-identity.functions";
import { fragmentKey, validateFragment, requireFragmentUser, fragmentError } from "@/lib/fragments";
export function FragmentImport({ close }: { close: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const libraryQuery = useLibrary(user?.id);
  const previousBooks = useQuery({
    queryKey: ["fragment-books", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fragment_books", {});
      if (error) throw error;
      return data ?? [];
    },
  });
  const [extraBooks, setExtraBooks] = useState<Book[]>([]);
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set());
  const [matching, setMatching] = useState(false);
  const cancelled = useRef(false);
  const [bookSearch, setBookSearch] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState<number | null>(null);
  const hydrate = (b: { id: string; title: string; authors: string[] }): Book => ({
    ...b,
    cover_url: null,
    description: null,
    categories: [],
    page_count: null,
    published_year: null,
  });
  const books = [
    ...new Map(
      [
        ...extraBooks,
        ...(previousBooks.data ?? []).map(hydrate),
        ...(libraryQuery.data ?? []).flatMap((i) => (i.books ? [i.books] : [])),
      ].map((b) => [b.id, b]),
    ).values(),
  ];
  const [rows, setRows] = useState<
    { entry: ImportedFragment; bookId: string; skip: boolean; automatic: boolean }[]
  >([]);
  const [notices, setNotices] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const load = async (file: File) => {
    cancelled.current = false;
    setBusy(true);
    setMatching(true);
    setRows([]);
    setExtraBooks([]);
    setBookSearch({});
    setNotices([]);
    setProgress("");
    try {
      setError("");
      if (file.size > 10 * 1024 * 1024) throw Error("Il file supera 10 MB.");
      const parsed = prepareFragmentImport(file.name, new Uint8Array(await file.arrayBuffer()));
      const [freshLibrary, freshFragments] = await Promise.all([
        libraryQuery.refetch(),
        previousBooks.refetch(),
      ]);
      if (freshLibrary.error) throw freshLibrary.error;
      if (freshFragments.error) throw freshFragments.error;
      const available = [
        ...new Map(
          [
            ...(freshFragments.data ?? []).map(hydrate),
            ...(freshLibrary.data ?? []).flatMap((i) => (i.books ? [i.books] : [])),
          ].map((b) => [b.id, b]),
        ).values(),
      ];
      setKnownIds(new Set(available.map((b) => b.id)));
      const associations = await associateFragmentBooks(parsed.rows, available, {
        search: (entry) =>
          searchBooks(
            `intitle:"${entry.title.replace(/["\n\r]/g, " ")}"${entry.authors[0] ? ` inauthor:"${entry.authors[0].replace(/["\n\r]/g, " ")}"` : ""}`,
            { max: 8 },
          ),
        resolve: (book) =>
          qc.fetchQuery({
            queryKey: ["recommendation-work-v1", book.id, book.title, book.authors.join("|")],
            queryFn: () => resolveRecommendationWork({ data: book }),
            staleTime: 300000,
          }),
        progress: (done, total) => setProgress(`Riconoscimento libri: ${done} / ${total}`),
        cancelled: () => cancelled.current,
      });
      setExtraBooks([
        ...new Map(
          [...associations.values()].flatMap((a) => a.candidates).map((b) => [b.id, b]),
        ).values(),
      ]);
      setRows(
        parsed.rows.map((entry) => {
          const match = associations.get(fragmentBookGroup(entry));
          return {
            entry,
            bookId: match?.bookId ?? "",
            automatic: match?.automatic ?? false,
            skip: false,
          };
        }),
      );
      setNotices([
        ...parsed.notices,
        ...(cancelled.current
          ? ["Riconoscimento interrotto. Puoi associare manualmente i libri rimasti."]
          : []),
      ]);
      setPage(0);
      setProgress("");
    } catch (e) {
      setError(fragmentError(e));
      setRows([]);
    } finally {
      setBusy(false);
      setMatching(false);
    }
  };
  const findBook = async (index: number) => {
    const query = bookSearch[fragmentBookGroup(rows[index]!.entry)]?.trim();
    if (busy || !query) return;
    setSearching(index);
    setError("");
    try {
      const hits = await searchBooks(query, { max: 8 });
      setExtraBooks((previous) => [
        ...new Map([...previous, ...hits].map((book) => [book.id, book])).values(),
      ]);
      if (!hits.length) setError("Nessun libro trovato. Prova con titolo e autore.");
      else
        setNotices((previous) => [
          ...previous.filter((n) => !n.startsWith("Ricerca:")),
          `Ricerca: ${hits.length} libri aggiunti alle opzioni. Scegli quello corretto dal menu.`,
        ]);
    } catch (e) {
      setError(fragmentError(e));
    } finally {
      setSearching(null);
    }
  };
  const change = (index: number, patch: Partial<(typeof rows)[number]>) =>
    setRows((r) => r.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  const assignGroup = (index: number, bookId: string) =>
    setRows((r) =>
      r.map((v, i) =>
        i === index || fragmentBookGroup(v.entry) === fragmentBookGroup(r[index]!.entry)
          ? { ...v, bookId, automatic: false }
          : v,
      ),
    );
  const selected = rows.filter((r) => !r.skip && r.bookId);
  const unmapped = rows.filter((r) => !r.skip && !r.bookId).length;
  const run = async () => {
    if (!user || busy || searching !== null || !selected.length) return;
    setBusy(true);
    setError("");
    let inserted = 0,
      duplicate = 0;
    const failed = new Set<ImportedFragment>();
    try {
      await requireFragmentUser(supabase, user.id);
      const preparedBooks = new Set(knownIds);
      for (const [i, row] of selected.entries()) {
        setProgress(`${i + 1} / ${selected.length}`);
        try {
          const entry = validateFragment(row.entry);
          if (!preparedBooks.has(row.bookId)) {
            const book = books.find((b) => b.id === row.bookId);
            if (!book) throw Error("Libro non disponibile: selezionalo di nuovo.");
            await cacheBook(book);
            preparedBooks.add(row.bookId);
          }
          const key = await fragmentKey(
            row.bookId,
            row.entry.source,
            row.entry.sourceRef,
            entry.quote,
            entry.position,
          );
          const { data, error: dbError } = await supabase
            .from("fragments")
            .upsert(
              {
                ...entry,
                user_id: user.id,
                book_id: row.bookId,
                source: row.entry.source,
                source_ref: row.entry.sourceRef,
                highlighted_at: row.entry.highlightedAt,
                dedupe_key: key,
              },
              { onConflict: "user_id,dedupe_key", ignoreDuplicates: true },
            )
            .select("id");
          if (dbError) throw dbError;
          if (data?.length) inserted++;
          else duplicate++;
        } catch (e) {
          if (
            ["PGRST205", "PGRST202", "42P01", "42501"].includes((e as { code?: string }).code ?? "")
          )
            throw e;
          failed.add(row.entry);
          setError(fragmentError(e));
        }
      }
      await qc.invalidateQueries({ queryKey: ["fragments"] });
      await qc.invalidateQueries({ queryKey: ["fragment-books"] });
      setRows((r) =>
        r.map((v) => (selected.includes(v) && !failed.has(v.entry) ? { ...v, skip: true } : v)),
      );
      setProgress(`${inserted} importati · ${duplicate} già presenti · ${failed.size} errori`);
      if (!failed.size) toast.success("Importazione completata");
    } catch (e) {
      setError(fragmentError(e));
      setProgress(
        "Importazione interrotta. Al prossimo tentativo i frammenti già salvati verranno saltati.",
      );
    } finally {
      await qc.invalidateQueries({ queryKey: ["fragments"] });
      await qc.invalidateQueries({ queryKey: ["fragment-books"] });
      setBusy(false);
    }
  };
  return (
    <section className="mb-8 rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">Importa sottolineature</h2>
        <button
          disabled={busy || searching !== null}
          onClick={close}
          className="text-sm text-muted-foreground"
        >
          Chiudi
        </button>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        Kindle My Clippings.txt, export Kobo TXT/Markdown/HTML e CSV, oppure lo ZIP Bookshelf con
        Cards. Riconosco automaticamente i libri nella tua libreria o già collegati ai frammenti;
        cerco nel catalogo quelli mancanti. Puoi correggere l’associazione prima di importare.
      </p>
      <input
        aria-label="File delle sottolineature"
        type="file"
        disabled={busy || searching !== null}
        accept=".txt,.md,.markdown,.csv,.html,.htm,.zip"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void load(file);
          e.target.value = "";
        }}
        className="max-w-full text-sm"
      />
      {matching && (
        <button
          type="button"
          onClick={() => {
            cancelled.current = true;
          }}
          className="ml-3 text-sm underline"
        >
          Interrompi riconoscimento
        </button>
      )}
      {notices.map((n) => (
        <p key={n} className="mt-2 text-xs text-muted-foreground">
          {n}
        </p>
      ))}
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {!!rows.length && (
        <>
          <p className="my-4 text-sm">
            {rows.length} frammenti riconosciuti ·{" "}
            {rows.filter((r) => r.automatic && r.bookId).length} associati automaticamente ·{" "}
            {selected.length} da importare · {unmapped} da associare. Nessuna frase viene usata per
            calcolare il progresso di lettura.
          </p>
          <p className="mb-4 text-xs text-muted-foreground">
            I libri trovati nel catalogo vengono collegati ai frammenti al momento
            dell’importazione, senza modificare la tua libreria o segnarli come letti.
          </p>
          <div className="space-y-4">
            {rows.slice(page * 10, page * 10 + 10).map((row, offset) => {
              const i = page * 10 + offset;
              return (
                <div key={i} className="rounded-xl border border-border p-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      disabled={busy}
                      checked={!row.skip}
                      onChange={(e) => change(i, { skip: !e.target.checked })}
                    />
                    {row.entry.kind === "note" ? "Nota" : "Citazione"} ·{" "}
                    {row.entry.title || "Titolo da associare"}
                  </label>
                  <textarea
                    aria-label={`Testo importato ${i + 1}`}
                    disabled={busy}
                    value={row.entry.quote}
                    maxLength={20000}
                    onChange={(e) => change(i, { entry: { ...row.entry, quote: e.target.value } })}
                    rows={3}
                    className="mt-2 w-full rounded-lg border bg-background p-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.entry.authors.join(", ")}
                    {row.entry.position ? ` · ${row.entry.position}` : ""}
                  </p>
                  {row.automatic && row.bookId && (
                    <p className="mt-2 text-xs text-primary">Libro associato automaticamente</p>
                  )}
                  <select
                    disabled={busy}
                    aria-label={`Libro per il frammento ${i + 1}`}
                    value={row.bookId}
                    onChange={(e) => assignGroup(i, e.target.value)}
                    className="mt-2 w-full rounded-lg border bg-background p-2 text-sm"
                  >
                    <option value="">
                      Associa a un libro — nessun salvataggio finché non lo scegli
                    </option>
                    {books.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} · {b.authors.join(", ")}
                      </option>
                    ))}
                  </select>
                  {!row.bookId && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input
                        aria-label={`Cerca libro per il frammento ${i + 1}`}
                        placeholder="Cerca titolo, autore o ISBN"
                        value={bookSearch[fragmentBookGroup(row.entry)] ?? ""}
                        disabled={busy || searching !== null}
                        onChange={(e) =>
                          setBookSearch((previous) => ({
                            ...previous,
                            [fragmentBookGroup(row.entry)]: e.target.value,
                          }))
                        }
                        className="min-w-0 flex-1 rounded border bg-background p-2 text-sm"
                      />
                      <button
                        type="button"
                        disabled={busy || searching !== null}
                        onClick={() => void findBook(i)}
                        className="rounded border px-3 py-2 text-sm"
                      >
                        {searching === i ? "Ricerca…" : "Cerca nel catalogo"}
                      </button>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    La scelta vale anche per gli altri frammenti con lo stesso titolo e autore nel
                    file.
                  </p>
                </div>
              );
            })}
          </div>
          <div className="my-4 flex items-center gap-3">
            <button
              disabled={busy || !page}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border px-3 py-1 text-sm disabled:opacity-40"
            >
              Precedenti
            </button>
            <span className="text-sm">
              {page + 1} / {Math.ceil(rows.length / 10)}
            </span>
            <button
              disabled={busy || (page + 1) * 10 >= rows.length}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border px-3 py-1 text-sm disabled:opacity-40"
            >
              Successivi
            </button>
          </div>
          {!!unmapped && (
            <p className="mb-3 text-xs text-muted-foreground">
              I frammenti non associati saranno esclusi da questa importazione.
            </p>
          )}
          <button
            disabled={busy || searching !== null || !selected.length}
            onClick={() => void run()}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Importazione…" : `Importa ${selected.length} frammenti`}
          </button>
        </>
      )}
      {progress && (
        <p role="status" className="mt-3 text-sm">
          {progress}
        </p>
      )}
    </section>
  );
}
