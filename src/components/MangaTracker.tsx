import { ProgressBar } from "./ProgressBar";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { type Book } from "@/lib/books";
import { type LibraryItem } from "@/lib/library";
import { decodeMangaProgress, saveMangaProgress } from "@/lib/manga-account";
import {
  MANGA_FIELD,
  readVolumes,
  volumeRanges,
  volumeNumber,
  mangaCompletion,
  mangaLibraryPatch,
  type MangaProgress,
} from "@/lib/manga-model";
export function MangaVolumeForm({
  book,
  initial,
  onSave,
  busy = false,
}: {
  book: Book;
  initial?: MangaProgress | undefined;
  onSave: (progress: MangaProgress) => Promise<void>;
  busy?: boolean;
}) {
  const [volumes, setVolumes] = useState(() => readVolumes(initial));
  const [total, setTotal] = useState(initial?.total ? String(initial.total) : "");
  const [edition, setEdition] = useState(initial?.edition ?? "");
  const [through, setThrough] = useState("");
  const [limit, setLimit] = useState(60);
  const [extra, setExtra] = useState("");
  const manga = book.manga!;
  const state = {
    ranges: volumeRanges(volumes),
    total: volumeNumber(total) ?? manga.totalVolumes,
    edition,
    updatedAt: new Date().toISOString(),
  };
  const progress = mangaCompletion(state, manga);
  const count = Math.max(
    progress.total ?? 20,
    ...volumes,
    progress.total ? 0 : (volumeNumber(extra) ?? 0),
  );
  const change = (n: number) =>
    setVolumes((old) => (old.includes(n) ? old.filter((v) => v !== n) : [...old, n]));
  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-5">
      <h2 className="font-display text-2xl">I tuoi volumi</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Una sola serie in libreria. Segna ogni volume letto, anche fuori ordine.
      </p>
      <form
        className="mt-5 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void onSave(state);
        }}
      >
        <fieldset disabled={busy} className="space-y-5">
          <div className="flex flex-wrap items-baseline gap-3">
            <strong className="font-display text-2xl">
              {progress.count}
              {progress.total ? ` / ${progress.total}` : ""} volumi letti
            </strong>
            <span className="text-xs text-primary">
              {progress.complete
                ? "Serie completata"
                : manga.status === "completed"
                  ? "Pubblicazione conclusa"
                  : manga.status === "ongoing"
                    ? "Serie in corso"
                    : "Totale finale da verificare"}
            </span>
          </div>
          {progress.total && (
            <ProgressBar current={progress.count} total={progress.total} showLabel={false} />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              La tua edizione (facoltativo)
              <input
                className="mt-1 w-full rounded-lg border border-border bg-background p-2"
                value={edition}
                maxLength={100}
                onChange={(e) => setEdition(e.target.value)}
                placeholder="Es. edizione italiana, omnibus…"
              />
            </label>
            <label className="text-sm">
              Totale volumi della tua edizione
              <input
                className="mt-1 w-full rounded-lg border border-border bg-background p-2"
                type="number"
                min={1}
                max={2000}
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                placeholder={manga.totalVolumes ? String(manga.totalVolumes) : "Non ancora noto"}
              />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            {manga.totalVolumes
              ? `Il catalogo indica ${manga.totalVolumes} volumi per l’edizione originale.`
              : "Il catalogo non indica ancora un totale definitivo."}{" "}
            Puoi indicare il totale della tua edizione: le ristampe e gli omnibus possono avere una
            numerazione diversa. Una serie in corso non diventa conclusa solo perché hai letto tutti
            i volumi indicati.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              Ho letto fino al volume
              <input
                aria-label="Letti fino al volume"
                type="number"
                min={1}
                max={progress.total ?? 2000}
                value={through}
                onChange={(e) => setThrough(e.target.value)}
                className="ml-2 w-20 rounded border border-border bg-background p-2"
              />
            </label>
            <button
              type="button"
              className="button-outline"
              disabled={
                !volumeNumber(through) ||
                (progress.total !== null && Number(through) > progress.total)
              }
              onClick={() => {
                const n = volumeNumber(through);
                if (n)
                  setVolumes((old) => [
                    ...new Set([...old, ...Array.from({ length: n }, (_, i) => i + 1)]),
                  ]);
              }}
            >
              Segna fino a qui
            </button>
          </div>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10" aria-label="Volumi della serie">
            {Array.from({ length: Math.min(count, limit) }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={volumes.includes(n)}
                aria-label={`Volume ${n}${volumes.includes(n) ? ", letto" : ""}`}
                onClick={() => change(n)}
                className={`min-h-11 rounded-md border text-sm ${volumes.includes(n) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-accent"}`}
              >
                {n}
                {volumes.includes(n) ? " ✓" : ""}
              </button>
            ))}
          </div>
          {count > limit && (
            <button
              type="button"
              className="button-outline"
              onClick={() => setLimit((old) => old + 60)}
            >
              Mostra altri volumi
            </button>
          )}
          {!progress.total && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm">
                Vai al volume{" "}
                <input
                  aria-label="Volume da aggiungere"
                  type="number"
                  min={1}
                  max={2000}
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  className="w-20 rounded border border-border bg-background p-2"
                />
              </label>
              <button
                type="button"
                className="button-outline"
                disabled={!volumeNumber(extra)}
                onClick={() => {
                  const n = volumeNumber(extra);
                  if (n) {
                    change(n);
                    setLimit(Math.ceil(n / 60) * 60);
                  }
                }}
              >
                Segna / deseleziona
              </button>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {progress.next && (!progress.total || progress.next <= progress.total)
              ? `Prossimo volume da leggere: ${progress.next}.`
              : "Tutti i volumi indicati sono letti."}{" "}
            Premi Salva per confermare le modifiche.
          </p>
          <button className="button-ink" disabled={busy}>
            {busy ? "Salvataggio…" : "Salva avanzamento volumi"}
          </button>
        </fieldset>
      </form>
    </section>
  );
}
export function MangaTracker({ book, item }: { book: Book; item: LibraryItem | null | undefined }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const initial = decodeMangaProgress(user?.user_metadata[MANGA_FIELD])[book.id];
  if (!user)
    return (
      <p className="mt-6 text-sm">
        <Link to="/auth" className="text-primary">
          Accedi
        </Link>{" "}
        per tenere traccia dei volumi.
      </p>
    );
  if (!item)
    return (
      <p className="mt-6 text-sm text-muted-foreground">
        Aggiungi la serie alla libreria per segnare i volumi letti.
      </p>
    );
  const save = async (progress: MangaProgress) => {
    if (busy) return;
    setBusy(true);
    try {
      const patch = mangaLibraryPatch(progress, book.manga!, item);
      await saveMangaProgress(supabase, user.id, book.id, progress);
      const { error } = await supabase
        .from("library_items")
        .update(patch)
        .eq("user_id", user.id)
        .eq("id", item.id)
        .select("id")
        .single();
      if (error)
        throw Error(
          "I volumi sono salvati, ma lo stato della serie non si è aggiornato. Premi di nuovo Salva per riallinearli.",
        );
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["library"] }),
        qc.invalidateQueries({ queryKey: ["library-item"] }),
        qc.invalidateQueries({ queryKey: ["community-rating", book.id] }),
      ]);
      toast.success(patch.status === "read" ? "Serie completata!" : "Volumi aggiornati");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Avanzamento non salvato. Riprova.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <MangaVolumeForm
      key={`${book.id}:${initial?.updatedAt ?? "new"}`}
      book={book}
      initial={initial}
      onSave={save}
      busy={busy}
    />
  );
}
export function MangaProgressLabel({ bookId }: { bookId: string }) {
  const { user } = useAuth();
  const state = decodeMangaProgress(user?.user_metadata[MANGA_FIELD])[bookId];
  return (
    <p className="mt-2 text-xs text-primary">
      Serie manga · {readVolumes(state).length} volumi letti
      {state?.total ? ` / ${state.total}` : ""}
    </p>
  );
}
