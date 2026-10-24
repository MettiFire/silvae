import { UiText, UiElement } from "@/lib/ui-language-context";
import { pageSeo } from "@/lib/site-seo";
import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Loader2, Trash2 } from "lucide-react";
import { toast } from "@/lib/localized-toast";
import { AppShell, PageHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cacheBook, searchBooks, type Book } from "@/lib/books";
import { descriptionText } from "@/lib/book-metadata";
import { prepareImportFile } from "@/lib/import-file";
import { resetUserLibrary } from "@/lib/reset-library";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  parseCSV,
  detectMapping,
  importRow,
  normalize,
  FIELD_LABELS,
  type ColumnMapping,
  type ImportField,
} from "@/lib/csv-import";

export const Route = createFileRoute("/_authenticated/import")({
  head: () =>
    pageSeo(
      "Importa la tua libreria — Silvae",
      "Importa libri e date di lettura da CSV Goodreads, Bookshelf e altri formati, verificando i dati prima del salvataggio.",
      undefined,
      true,
    ),
  component: ImportPage,
});
type Result = {
  title: string;
  message: string;
  bookId?: string;
  kind: "imported" | "skipped" | "error";
};
const inputClass = "rounded-lg border border-border bg-background px-3 py-2 text-sm";

function ImportPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [fileName, setFileName] = useState("");
  const [csv, setCSV] = useState<ReturnType<typeof parseCSV> | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>(() => detectMapping([]));
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dateOrder, setDateOrder] = useState<"day-first" | "month-first">("day-first");
  const [overwrite, setOverwrite] = useState(false);
  const [fileError, setFileError] = useState("");
  const [fileNotices, setFileNotices] = useState<string[]>([]);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState("");
  const cancel = useRef(false);
  const fields = Object.keys(FIELD_LABELS) as ImportField[];
  const preview =
    csv?.rows.slice(0, 5).map((row) => {
      try {
        return { value: importRow(row, mapping, dateOrder), error: "" };
      } catch (error) {
        return { value: null, error: error instanceof Error ? error.message : "Riga non valida" };
      }
    }) ?? [];

  async function resetLibrary() {
    if (!user || busy || resetBusy || resetConfirmation !== "SVUOTA") return;
    setResetBusy(true);
    setResetError("");
    try {
      const count = await resetUserLibrary(supabase, user.id);
      setResults([]);
      setProgress(0);
      setResetOpen(false);
      setResetConfirmation("");
      await qc.invalidateQueries();
      toast.success(`Libreria svuotata: ${count} libri rimossi. Ora puoi importare un nuovo CSV.`);
    } catch (error) {
      setResetError(
        (error as { message?: string })?.message ??
          "Non è stato possibile svuotare la libreria. Riprova.",
      );
    } finally {
      setResetBusy(false);
    }
  }

  async function loadFile(file: File) {
    setFileError("");
    setFileNotices([]);
    setCSV(null);
    setResults([]);
    setProgress(0);
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("Il file supera 10 MB. Dividilo in file più piccoli.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const prepared = prepareImportFile(file.name, bytes);
      setCSV(prepared.parsed);
      setMapping(prepared.mapping);
      setFileNotices(prepared.notices);
      setFileName(file.name);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Impossibile leggere il file");
    }
  }

  async function runImport() {
    if (!csv || !user || busy || resetBusy) return;
    cancel.current = false;
    setBusy(true);
    setResults([]);
    setProgress(0);
    const out: Result[] = [];
    try {
      // Supabase caps individual responses: duplicate protection must cover the whole library.
      const existing: { book_id: string; books: { title: string; authors: string[] } | null }[] =
        [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase
          .from("library_items")
          .select("book_id, books(title,authors)")
          .eq("user_id", user.id)
          .order("id")
          .range(offset, offset + 499);
        if (error) throw error;
        existing.push(...(data ?? []));
        if ((data?.length ?? 0) < 500) break;
      }
      const knownIds = new Set((existing ?? []).map((i) => i.book_id));
      const signature = (title: string, author: string) =>
        `${normalize(title)}|${normalize(author)}`;
      const knownTitles = new Map(
        existing.map((i) => [
          signature(i.books?.title ?? "", i.books?.authors?.join(", ") ?? ""),
          i.book_id,
        ]),
      );
      for (const [index, row] of csv.rows.entries()) {
        if (cancel.current) break;
        let title = row[mapping.title] || `Riga ${index + 2}`;
        try {
          const item = importRow(row, mapping, dateOrder);
          title = item.title || item.isbn;
          const sig = signature(item.title, item.author);
          if (!overwrite && item.title && knownTitles.has(sig)) {
            out.push({ title, message: "Già in libreria: dati conservati", kind: "skipped" });
            setProgress(index + 1);
            continue;
          }
          let found: Book | undefined;
          const googleId =
            /^googlebooks$/i.test(item.source) &&
            /^[A-Za-z0-9_-]{6,64}$/.test(item.sourceId) &&
            !/^\d{10,13}$/.test(item.sourceId)
              ? item.sourceId
              : null;
          if (googleId && item.title) {
            // Bookshelf already exports the exact Google volume ID: preserve it
            // and its title instead of re-matching to a different language/edition.
            found = {
              id: googleId,
              title: item.title,
              authors: item.author ? [item.author] : [],
              cover_url: `https://books.google.com/books/content?id=${encodeURIComponent(googleId)}&printsec=frontcover&img=1&zoom=1`,
              published_year: item.year,
              page_count: item.pages,
              categories: item.categories,
              description: descriptionText(item.description) || null,
            };
          }
          // ISBN is an exact lookup. A title-only match needs matching title AND author.
          try {
            if (!found) {
              const hits = await searchBooks(
                item.isbn
                  ? `isbn:${item.isbn}`
                  : `intitle:"${item.title}"${item.author ? ` inauthor:"${item.author}"` : ""}`,
                { max: 5 },
              );
              found = item.isbn
                ? hits[0]
                : hits.find(
                    (b) =>
                      normalize(b.title) === normalize(item.title) &&
                      !!item.author &&
                      b.authors.some((a) => normalize(a) === normalize(item.author)),
                  );
            }
          } catch {
            /* Preserve CSV metadata even when both catalogues are unavailable. */
          }
          if (cancel.current) break;
          if (!found && !item.title)
            throw new Error("ISBN non trovato: aggiungi anche il titolo al CSV e riprova.");
          const book: Book = found
            ? {
                ...found,
                title: item.title || found.title,
                authors: item.author ? [item.author] : found.authors,
                published_year: item.year ?? found.published_year,
                categories: item.categories.length ? item.categories : found.categories,
                description: descriptionText(item.description) || found.description,
                cover_url: item.cover || found.cover_url,
                page_count: item.pages ?? found.page_count,
              }
            : {
                id: item.isbn ? `csv:isbn:${item.isbn}` : `csv:${crypto.randomUUID()}`,
                title: item.title,
                authors: item.author ? [item.author] : [],
                cover_url:
                  item.cover ||
                  (item.isbn
                    ? `https://covers.openlibrary.org/b/isbn/${item.isbn}-L.jpg?default=false`
                    : null),
                page_count: item.pages,
                published_year: item.year,
                categories: item.categories,
                description: descriptionText(item.description) || null,
              };
          const existingId = item.title ? knownTitles.get(sig) : undefined;
          if (existingId) book.id = existingId;
          if (!overwrite && knownIds.has(book.id)) {
            out.push({
              title: book.title,
              bookId: book.id,
              message: "Già in libreria: dati conservati",
              kind: "skipped",
            });
          } else {
            await cacheBook(book);
            const total = item.pages ?? book.page_count;
            const done =
              item.status === "read" ||
              (item.status === "reading" &&
                total != null &&
                total > 0 &&
                (item.currentPage ?? 0) >= total);
            const { error: saveError } = await supabase.from("library_items").upsert(
              {
                user_id: user.id,
                book_id: book.id,
                status: done ? "read" : item.status,
                rating: item.rating,
                favorite: item.favorite,
                total_pages: total,
                current_page: done ? (total ?? item.currentPage ?? 0) : (item.currentPage ?? 0),
                started_at: item.started,
                finished_at: done ? item.finished : null,
                needs_review: !found,
                ...(item.readCount != null
                  ? {
                      reread_count: Math.max(0, item.readCount - 1),
                      last_reread_at: item.readCount > 1 ? item.finished : null,
                    }
                  : {}),
              },
              { onConflict: "user_id,book_id", ignoreDuplicates: !overwrite },
            );
            if (saveError) throw saveError;
            knownIds.add(book.id);
            knownTitles.set(sig, book.id);
            out.push({
              title: book.title,
              bookId: book.id,
              message: `${found ? "Importato" : "Importato dai dati CSV · abbinamento da verificare"}${done && !item.finished ? " · data di fine sconosciuta: escluso dalle sfide con limiti temporali" : ""}`,
              kind: "imported",
            });
          }
        } catch (error) {
          out.push({
            title,
            message:
              error instanceof Error
                ? error.message
                : ((error as { message?: string })?.message ?? "Salvataggio non riuscito"),
            kind: "error",
          });
        }
        setProgress(index + 1);
      }
      setResults(out);
      toast.success(
        cancel.current
          ? "Importazione interrotta. I libri già salvati restano in libreria."
          : "Importazione terminata. Controlla il riepilogo.",
      );
    } catch (error) {
      toast.error((error as { message?: string })?.message ?? "Importazione non riuscita");
    } finally {
      setBusy(false);
      void qc.invalidateQueries({ queryKey: ["library"] });
      void qc.invalidateQueries({ queryKey: ["library-item"] });
      void qc.invalidateQueries({ queryKey: ["community-rating"] });
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Importa libri da CSV"
        subtitle="Bookshelf (CSV o ZIP), Goodreads, StoryGraph o un tuo foglio: scegli le colonne, controlla l’anteprima e importa."
        action={
          <button
            type="button"
            disabled={busy || resetBusy}
            onClick={() => {
              setResetOpen(true);
              setResetConfirmation("");
              setResetError("");
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 px-4 py-2 text-sm text-destructive disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            <UiText text=" Svuota libreria" />
          </button>
        }
      />
      <AlertDialog
        open={resetOpen}
        onOpenChange={(open) => {
          if (!resetBusy) setResetOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <UiText text="Svuotare la tua libreria?" />
            </AlertDialogTitle>
            <AlertDialogDescription>
              <UiText text="Verranno rimossi tutti i libri dalla tua libreria personale, con stati, progressi, voti e preferiti. Questa operazione non può essere annullata. Recensioni, liste e profilo vengono conservati." />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="space-y-2 text-sm">
            <UiText text="Per confermare, scrivi SVUOTA" />
            <input
              autoComplete="off"
              value={resetConfirmation}
              disabled={resetBusy}
              onChange={(e) => setResetConfirmation(e.target.value)}
              className={`${inputClass} mt-2 w-full`}
            />
          </label>
          {resetError && (
            <p role="alert" className="text-sm text-destructive">
              {resetError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetBusy}>
              <UiText text="Annulla" />
            </AlertDialogCancel>
            <button
              type="button"
              disabled={resetConfirmation !== "SVUOTA" || resetBusy}
              onClick={() => void resetLibrary()}
              className="rounded-lg bg-destructive px-4 py-2 text-sm text-destructive-foreground disabled:opacity-50"
            >
              <UiText
                text={resetBusy ? "Svuotamento…" : "Elimina tutti i libri dalla mia libreria"}
              />
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <label
        className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center ${busy ? "opacity-60" : "cursor-pointer hover:border-primary"}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!busy && !resetBusy && !resetOpen && e.dataTransfer.files[0])
            void loadFile(e.dataTransfer.files[0]);
        }}
      >
        <Upload className="h-8 w-8 text-primary" />
        <span className="font-semibold">
          <UiText text="Trascina un CSV o ZIP Bookshelf, oppure scegli un file" />
        </span>
        <span className="text-sm text-muted-foreground">
          <UiText text="CSV con virgola, punto e virgola o tab · ZIP Bookshelf · massimo 10 MB / 5.000 libri" />
        </span>
        <UiElement
          as="input"
          type="file"
          accept=".csv,.tsv,.zip,text/csv,text/tab-separated-values,application/zip,application/x-zip-compressed"
          disabled={busy || resetBusy || resetOpen}
          aria-label="Scegli CSV o ZIP Bookshelf"
          className="max-w-full text-sm"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void loadFile(file);
            e.target.value = "";
          }}
        />
      </label>
      <a href="/import-template.csv" download className="mt-3 inline-block text-sm text-primary">
        <UiText text="Scarica un CSV di esempio" />
      </a>
      {fileNotices.length > 0 && (
        <div
          role="status"
          className="mt-4 space-y-2 rounded-xl border border-border bg-accent p-4 text-sm"
        >
          {fileNotices.map((notice) => (
            <p key={notice}>{notice}</p>
          ))}
        </div>
      )}
      {fileError && (
        <p role="alert" className="mt-4 text-destructive">
          {fileError}
        </p>
      )}
      {csv && (
        <section className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold">
            <UiText text="1. Associa le colonne" />
          </h2>
          <p className="text-sm text-muted-foreground">
            {fileName} · {csv.rows.length}
            <UiText text=" libri. Serve almeno il titolo o l’ISBN. Le date accettano anche “15 ago 2023”; i voti accettano anche “4/5”." />
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((field) => (
              <label key={field} className="flex min-w-0 flex-col gap-1 text-sm">
                {FIELD_LABELS[field]}
                <select
                  className={inputClass}
                  value={mapping[field]}
                  disabled={busy || resetBusy || resetOpen}
                  onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}
                >
                  <option value="">
                    <UiText text="Non importare" />
                  </option>
                  {csv.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <label className="flex flex-wrap items-center gap-3 text-sm">
            <UiText text="Formato delle date numeriche" />
            <select
              className={inputClass}
              value={dateOrder}
              disabled={busy || resetBusy}
              onChange={(e) => setDateOrder(e.target.value as typeof dateOrder)}
            >
              <option value="day-first">
                <UiText text="Giorno / mese / anno (31/12/2026)" />
              </option>
              <option value="month-first">
                <UiText text="Mese / giorno / anno (12/31/2026)" />
              </option>
            </select>
          </label>
          <p className="text-xs text-muted-foreground">
            <UiText text="Le date AAAA-MM-GG e quelle con il nome del mese sono riconosciute automaticamente. Controlla le date ambigue nell’anteprima." />
          </p>
          <h2 className="font-display text-lg font-semibold">
            <UiText text="2. Controlla l’anteprima" />
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  {["Titolo / ISBN", "Autore", "Stato", "Voto", "Inizio", "Fine"].map((h) => (
                    <th key={h} className="border-b p-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i}>
                    {r.error ? (
                      <td colSpan={6} className="p-2 text-destructive">
                        <UiText text="Riga " />
                        {i + 2}: {r.error}
                      </td>
                    ) : (
                      <>
                        <td className="p-2">{r.value?.title || r.value?.isbn}</td>
                        <td className="p-2">{r.value?.author}</td>
                        <td className="p-2">
                          {
                            {
                              to_read: "Da leggere",
                              read: "Letto",
                              reading: "In lettura",
                              abandoned: "Abbandonato",
                            }[r.value!.status]
                          }
                        </td>
                        <td className="p-2">{r.value?.rating ?? "—"}</td>
                        <td className="p-2">{r.value?.started?.slice(0, 10) ?? "—"}</td>
                        <td className="p-2">{r.value?.finished?.slice(0, 10) ?? "—"}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={overwrite}
              disabled={busy || resetBusy || resetOpen}
              onChange={(e) => setOverwrite(e.target.checked)}
            />
            <UiText text="Aggiorna anche i libri già presenti (sostituisce stato, voto, date, preferiti e progresso con i dati del CSV)." />
          </label>
          <p className="text-sm text-muted-foreground">
            <UiText text="Di norma i duplicati vengono saltati. I libri senza corrispondenza certa vengono conservati con il titolo e l’autore del CSV e segnalati per la verifica. Non vengono inventate date di lettura." />
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              disabled={busy || resetBusy || resetOpen || (!mapping.title && !mapping.isbn)}
              onClick={() => void runImport()}
              className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
            >
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> {progress}/{csv.rows.length}
                </span>
              ) : (
                `3. Importa ${csv.rows.length} libri`
              )}
            </button>
            {busy && (
              <button
                onClick={() => {
                  cancel.current = true;
                }}
                className={inputClass}
              >
                <UiText text="Interrompi dopo il libro corrente" />
              </button>
            )}
          </div>
          {busy && (
            <UiElement
              as="progress"
              aria-label="Avanzamento importazione"
              className="w-full"
              value={progress}
              max={csv.rows.length}
            />
          )}
        </section>
      )}
      {results.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 font-display text-xl font-semibold">
            {results.filter((r) => r.kind === "imported").length}
            <UiText text=" importati · " />
            {results.filter((r) => r.kind === "skipped").length}
            <UiText text=" già presenti · " />
            {results.filter((r) => r.kind === "error").length}
            <UiText text=" errori" />
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            <UiText text="Correggi nel CSV le righe con errori e caricalo di nuovo: i libri già importati verranno saltati." />
          </p>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {results.map((r, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2 p-3 text-sm">
                {r.bookId ? (
                  <Link
                    to="/book/$bookId"
                    params={{ bookId: r.bookId }}
                    className="font-medium hover:text-primary"
                  >
                    {r.title}
                  </Link>
                ) : (
                  <span>{r.title}</span>
                )}
                <span className={r.kind === "error" ? "text-destructive" : "text-muted-foreground"}>
                  {r.message}
                </span>
              </li>
            ))}
          </ul>
          <Link to="/library" className="mt-4 inline-block text-primary">
            <UiText text="Apri la mia libreria →" />
          </Link>
        </section>
      )}
    </AppShell>
  );
}
