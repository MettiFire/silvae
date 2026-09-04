import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, CheckCircle2, AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cacheBook, searchBooks, type Book } from "@/lib/books";
import type { ReadingStatus } from "@/lib/library";

export const Route = createFileRoute("/_authenticated/import")({
  head: () => ({
    meta: [
      { title: "Importa da Goodreads — Paginae" },
      { name: "description", content: "Carica il tuo export CSV di Goodreads e trasferisci la libreria su Paginae." },
      { property: "og:title", content: "Importa da Goodreads — Paginae" },
      { property: "og:description", content: "Carica il CSV di Goodreads e trasferisci la tua libreria." },
    ],
  }),
  component: ImportPage,
});

type Row = Record<string, string>;

type Result = {
  title: string;
  author: string;
  status: ReadingStatus;
  rating: number | null;
  book: Book | null;
};

/** Minimal RFC-4180 CSV parser (handles quoted fields and embedded commas/newlines).
 *  Detects comma vs tab delimiters and strips the UTF-8 BOM. */
function parseCSV(raw: string): Row[] {
  const text = raw.replace(/^[\uFEFF]/, "");
  const firstLine = text.slice(0, text.indexOf("\n") === -1 ? text.length : text.indexOf("\n"));
  const delim = (firstLine.match(/\t/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? "\t" : ",";
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows;
  if (!header) return [];
  return body
    .filter((r) => r.some((v) => v.trim()))
    .map((r) => Object.fromEntries(header.map((h, idx) => [h.trim(), (r[idx] ?? "").trim()])));
}

function mapStatus(shelf: string): ReadingStatus {
  const s = shelf.toLowerCase().trim();
  if (s.includes("currently") || s.includes("in-lettura") || s.includes("reading")) return "reading";
  if (s.includes("abandon") || s.includes("did-not-finish") || s.includes("dnf") || s.includes("unfinished"))
    return "abandoned";
  // "to-read" / "unread" / "want-to-read" contengono "read": vanno controllati PRIMA di "read".
  if (
    s.includes("to-read") ||
    s.includes("to read") ||
    s.includes("unread") ||
    s.includes("not-yet") ||
    s.includes("not started") ||
    s.includes("want") ||
    s.includes("wish")
  )
    return "to_read";
  if (s.includes("read") || s.includes("finished") || s.includes("completed")) return "read";
  return "to_read";
}

/** Converte valori tipo "yes"/"true"/"1"/"x" in booleano. */
function truthy(v: string | undefined): boolean {
  return /^(y|yes|true|1|x|sì|si)$/i.test((v ?? "").trim());
}

function parseDate(v: string | undefined): string | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function clean(isbn: string) {
  return isbn.replace(/[^0-9Xx]/g, "");
}

function ImportPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<Result[]>([]);

  async function handleFile(file: File) {
    if (!user) return;
    setBusy(true);
    setResults([]);
    try {
      const rows = parseCSV(await file.text());
      if (!rows.length) {
        toast.error("CSV vuoto o non valido");
        return;
      }
      setProgress({ done: 0, total: rows.length });
      const out: Result[] = [];
      for (const r of rows) {
        const title = r["Title"] ?? r["title"] ?? "";
        const author = r["Author"] ?? r["author"] ?? "";
        // Supporta sia Goodreads (ISBN13/ISBN) sia export con ISBN-13/ISBN-10.
        const isbn = clean(r["ISBN13"] ?? r["ISBN-13"] ?? r["ISBN"] ?? r["ISBN-10"] ?? "");
        const shelf = (r["Exclusive Shelf"] || r["Reading Status"] || r["Bookshelves"] || "").trim();
        const dateRead = parseDate(r["Date Read"] ?? r["End Date"]);
        const dateStarted = parseDate(r["Date Started"] ?? r["Start Date"]);
        const favorite = truthy(r["Is Favorite"]);
        // Senza scaffale esplicito: se c'è una data di lettura o un voto, è "letto".
        const rawRating = Number(r["My Rating"] ?? r["Rating"] ?? 0);
        const rating = rawRating > 0 ? rawRating : null;
        const status: ReadingStatus = shelf ? mapStatus(shelf) : dateRead || rating ? "read" : "to_read";

        let book: Book | null = null;
        try {
          const hits = isbn
            ? await searchBooks(`isbn:${isbn}`, { max: 1 })
            : await searchBooks(`intitle:"${title}" inauthor:"${author}"`, { max: 1 });
          book = hits[0] ?? null;
        } catch {
          book = null;
        }

        if (book) {
          try {
            await cacheBook(book);
            const now = new Date().toISOString();
            await supabase.from("library_items").upsert(
              {
                user_id: user.id,
                book_id: book.id,
                status,
                rating,
                favorite,
                total_pages: book.page_count,
                current_page: status === "read" ? (book.page_count ?? 0) : 0,
                started_at: status === "reading" ? (dateStarted ?? null) : dateStarted,
                finished_at: status === "read" ? (dateRead ?? now) : null,
                needs_review: false,
              },
              { onConflict: "user_id,book_id" },
            );
          } catch {
            book = null;
          }
        }

        out.push({ title, author, status, rating, book });
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      }
      setResults(out);
      void qc.invalidateQueries({ queryKey: ["library"] });
      const ok = out.filter((o) => o.book).length;
      toast.success(`${ok} libri importati su ${out.length}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore durante l'import");
    } finally {
      setBusy(false);
    }
  }

  const imported = results.filter((r) => r.book);
  const manual = results.filter((r) => !r.book);
  const STATUS_LABEL: Record<ReadingStatus, string> = {
    reading: "In lettura",
    read: "Letti",
    to_read: "Da leggere",
    abandoned: "Abbandonati",
  };
  const byStatus = (["reading", "read", "to_read", "abandoned"] as ReadingStatus[]).map((s) => ({
    status: s,
    items: imported.filter((r) => r.status === s),
  }));

  async function resetLibrary() {
    if (!user) return;
    const ok = window.confirm(
      "Vuoi davvero svuotare TUTTA la libreria? Questa azione elimina stati, progressi, voti e preferiti e non si può annullare.",
    );
    if (!ok) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("library_items").delete().eq("user_id", user.id);
      if (error) throw error;
      setResults([]);
      void qc.invalidateQueries({ queryKey: ["library"] });
      toast.success("Libreria svuotata");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore durante il reset");
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (busy) return;
    const f = Array.from(e.dataTransfer.files).find((x) => x.name.toLowerCase().endsWith(".csv") || x.type === "text/csv");
    if (!f) {
      toast.error("Trascina un file .csv");
      return;
    }
    void handleFile(f);
  }

  return (
    <AppShell>
      <PageHeader
        title="Importa libreria da CSV"
        subtitle="Carica l'export CSV della tua libreria (Goodreads o formato con ISBN-13/Reading Status): i libri vengono abbinati e assegnati allo stato corretto."
        action={
          <button
            type="button"
            onClick={() => void resetLibrary()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> Svuota libreria
          </button>
        }
      />

      <label
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition ${
          dragging ? "border-primary bg-accent" : "border-border bg-card hover:border-primary/50"
        }`}
      >
        {busy ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <Upload className="h-8 w-8 text-primary" />}
        <span className="font-display text-lg font-semibold">
          {busy
            ? `Importazione… ${progress.done}/${progress.total}`
            : dragging
              ? "Rilascia il file qui"
              : "Trascina qui il CSV o clicca per selezionarlo"}
        </span>
        <span className="text-sm text-muted-foreground">
          Supportati export Goodreads (Title, Author, ISBN13, My Rating, Exclusive Shelf, Date Read) ed export con
          ISBN-10/ISBN-13, Reading Status, Rating, Start/End Date, Is Favorite. Separatore virgola o tab.
        </span>
        </span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          disabled={busy}
          aria-label="File CSV Goodreads"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
      </label>

      {busy && progress.total > 0 && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(progress.done / progress.total) * 100}%` }}
          />
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-10 space-y-10">
          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold">
              <CheckCircle2 className="h-5 w-5 text-primary" /> Importati ({imported.length})
            </h2>
            <div className="mb-3 flex flex-wrap gap-2">
              {byStatus
                .filter((g) => g.items.length > 0)
                .map((g) => (
                  <span
                    key={g.status}
                    className="rounded-full border border-border bg-accent px-3 py-1 text-xs font-medium"
                  >
                    {STATUS_LABEL[g.status]}: {g.items.length}
                  </span>
                ))}
            </div>
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
              {imported.slice(0, 100).map((r, i) => (
                <li key={`${r.title}-${i}`} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                  <Link to="/book/$bookId" params={{ bookId: r.book!.id }} className="truncate hover:text-primary">
                    {r.book!.title}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground">{STATUS_LABEL[r.status]}</span>
                </li>
              ))}
              {imported.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">Nessun libro importato.</li>}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold">
              <AlertTriangle className="h-5 w-5 text-primary" /> Da verificare manualmente ({manual.length})
            </h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Non siamo riusciti ad abbinare questi titoli. Cercali a mano e aggiungili alla libreria.
            </p>
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
              {manual.map((r, i) => (
                <li key={`${r.title}-manual-${i}`} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                  <span className="truncate">
                    {r.title} <span className="text-muted-foreground">— {r.author}</span>
                  </span>
                  <Link
                    to="/discover"
                    className="shrink-0 rounded-lg border border-border px-2 py-1 text-xs transition hover:bg-accent"
                  >
                    Cerca
                  </Link>
                </li>
              ))}
              {manual.length === 0 && (
                <li className="px-4 py-3 text-sm text-muted-foreground">Tutti i titoli sono stati abbinati.</li>
              )}
            </ul>
          </section>
        </div>
      )}
    </AppShell>
  );
}
