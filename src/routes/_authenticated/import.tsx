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
  // "to-read" / "want-to-read" contengono "read": vanno controllati PRIMA di "read".
  if (s.includes("to-read") || s.includes("to read") || s.includes("want") || s.includes("wish")) return "to_read";
  if (s.includes("read")) return "read";
  return "to_read";
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
        const isbn = clean(r["ISBN13"] ?? r["ISBN"] ?? "");
        const shelf = (r["Exclusive Shelf"] || r["Bookshelves"] || "").trim();
        const dateRead = (r["Date Read"] ?? "").trim();
        // Senza scaffale esplicito: se c'è una data di lettura o un voto, è "letto".
        const rawRating = Number(r["My Rating"] ?? 0);
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
                total_pages: book.page_count,
                current_page: status === "read" ? (book.page_count ?? 0) : 0,
                finished_at: status === "read" ? (r["Date Read"] ? new Date(r["Date Read"]).toISOString() : now) : null,
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
  const byStatus = (["reading", "read", "to_read", "abandoned"] as ReadingStatus[]).map((s) => ({
    status: s,
    items: imported.filter((r) => r.status === s),
  }));

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
        title="Importa da Goodreads"
        subtitle="Esporta la tua libreria da Goodreads (My Books → Import and export) e carica qui il file CSV."
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
          Riconosciamo i campi Title, Author, ISBN, My Rating, Exclusive Shelf e Date Read.
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
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
              {imported.slice(0, 100).map((r, i) => (
                <li key={`${r.title}-${i}`} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                  <Link to="/book/$bookId" params={{ bookId: r.book!.id }} className="truncate hover:text-primary">
                    {r.book!.title}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground">{r.status}</span>
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
