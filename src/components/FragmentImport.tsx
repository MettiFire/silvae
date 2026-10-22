import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { supabase } from "@/integrations/supabase/client";
import {
  prepareFragmentImport,
  matchFragmentBook,
  type ImportedFragment,
} from "@/lib/fragment-import";
import { fragmentKey, validateFragment, requireFragmentUser, fragmentError } from "@/lib/fragments";
export function FragmentImport({ close }: { close: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: library = [] } = useLibrary(user?.id);
  const books = library.flatMap((i) => (i.books ? [i.books] : []));
  const [rows, setRows] = useState<{ entry: ImportedFragment; bookId: string; skip: boolean }[]>(
    [],
  );
  const [notices, setNotices] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const load = async (file: File) => {
    try {
      setError("");
      if (file.size > 10 * 1024 * 1024) throw Error("Il file supera 10 MB.");
      const parsed = prepareFragmentImport(file.name, new Uint8Array(await file.arrayBuffer()));
      setRows(
        parsed.rows.map((entry) => ({
          entry,
          bookId: matchFragmentBook(entry, books),
          skip: false,
        })),
      );
      setNotices(parsed.notices);
      setPage(0);
      setProgress("");
    } catch (e) {
      setError(fragmentError(e));
      setRows([]);
    }
  };
  const change = (index: number, patch: Partial<(typeof rows)[number]>) =>
    setRows((r) => r.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  const assignGroup = (index: number, bookId: string) =>
    setRows((r) =>
      r.map((v, i) =>
        i === index ||
        (v.entry.title === r[index]!.entry.title &&
          v.entry.authors.join("|") === r[index]!.entry.authors.join("|"))
          ? { ...v, bookId }
          : v,
      ),
    );
  const selected = rows.filter((r) => !r.skip && r.bookId);
  const unmapped = rows.filter((r) => !r.skip && !r.bookId).length;
  const run = async () => {
    if (!user || busy || !selected.length) return;
    setBusy(true);
    setError("");
    let inserted = 0,
      duplicate = 0;
    const failed = new Set<ImportedFragment>();
    try {
      await requireFragmentUser(supabase, user.id);
      for (const [i, row] of selected.entries()) {
        setProgress(`${i + 1} / ${selected.length}`);
        try {
          const entry = validateFragment(row.entry);
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
        <button disabled={busy} onClick={close} className="text-sm text-muted-foreground">
          Chiudi
        </button>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        Kindle My Clippings.txt, export Kobo TXT/Markdown/HTML e CSV, oppure lo ZIP Bookshelf con
        Cards. I libri devono essere già nella tua libreria per associarli qui.
      </p>
      <input
        aria-label="File delle sottolineature"
        type="file"
        disabled={busy}
        accept=".txt,.md,.markdown,.csv,.html,.htm,.zip"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void load(file);
          e.target.value = "";
        }}
        className="max-w-full text-sm"
      />
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
            {rows.length} frammenti riconosciuti · {selected.length} da importare · {unmapped} da
            associare. Nessuna frase viene usata per calcolare il progresso di lettura.
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
                  <p className="mt-1 text-xs text-muted-foreground">{row.entry.position}</p>
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
            disabled={busy || !selected.length}
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
