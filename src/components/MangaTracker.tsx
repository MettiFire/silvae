import { useMangaVolumeCovers } from "@/lib/use-manga-volume-covers";
import { UiText, UiElement } from "@/lib/ui-language-context";
import { MangaVolumeCover, MangaVolumeGallery } from "./MangaVolumeCover";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { ProgressBar } from "./ProgressBar";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/localized-toast";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { type Book } from "@/lib/books";
import { type LibraryItem } from "@/lib/library";
import { decodeMangaProgress, saveMangaProgress } from "@/lib/manga-account";
import {
  MANGA_FIELD,
  missingPreviousVolumes,
  selectMangaVolume,
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
  const [page, setPage] = useState(0);
  const [pendingVolume, setPendingVolume] = useState<number | null>(null);
  const covers = useMangaVolumeCovers(book);
  const coversByVolume = new Map((covers.data ?? []).map((c) => [c.volume, c]));
  const [extra, setExtra] = useState("");
  const manga = book.manga!;
  const state = {
    ranges: volumeRanges(volumes),
    total: volumeNumber(total) ?? manga.totalVolumes,
    edition,
    updatedAt: new Date().toISOString(),
  };
  const progress = mangaCompletion(state, manga);
  const customNumbering =
    (state.total !== null && manga.totalVolumes !== null && state.total !== manga.totalVolumes) ||
    /omnibus/i.test(edition);
  const count = Math.max(
    progress.total ?? 20,
    ...volumes,
    progress.total ? 0 : (volumeNumber(extra) ?? 0),
  );
  const change = (n: number) => {
    if (!volumes.includes(n) && missingPreviousVolumes(volumes, n).length) setPendingVolume(n);
    else setVolumes((old) => selectMangaVolume(old, n));
  };
  const safePage = Math.min(page, Math.max(0, Math.ceil(count / 48) - 1));
  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-5">
      <h2 className="font-display text-2xl">
        <UiText text="I tuoi volumi" />
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        <UiText text="Una sola serie in libreria. Segna ogni volume letto, anche fuori ordine." />
      </p>
      <Dialog
        open={pendingVolume !== null}
        onOpenChange={(open) => {
          if (!open) setPendingVolume(null);
        }}
      >
        <DialogContent>
          <DialogTitle>
            <UiText text="Hai letto anche i volumi precedenti?" />
          </DialogTitle>
          <DialogDescription>
            <UiText text="Stai segnando il volume " />
            {pendingVolume}
            <UiText text=". Ci sono" />{" "}
            {pendingVolume ? missingPreviousVolumes(volumes, pendingVolume).length : 0}
            <UiText text=" volumi precedenti non ancora letti." />
          </DialogDescription>
          <div className="mt-4 flex flex-col gap-3">
            <button
              type="button"
              className="button-ink"
              onClick={() => {
                if (pendingVolume) setVolumes((old) => selectMangaVolume(old, pendingVolume, true));
                setPendingVolume(null);
              }}
            >
              <UiText text="Segna anche tutti i precedenti" />
            </button>
            <button
              type="button"
              className="button-outline"
              onClick={() => {
                if (pendingVolume) setVolumes((old) => selectMangaVolume(old, pendingVolume));
                setPendingVolume(null);
              }}
            >
              <UiText text="Solo questo volume" />
            </button>
            <button
              type="button"
              className="text-sm text-muted-foreground"
              onClick={() => setPendingVolume(null)}
            >
              <UiText text="Annulla" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
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
              {progress.total ? ` / ${progress.total}` : ""}
              <UiText text=" volumi letti" />
            </strong>
            <span className="text-xs text-primary">
              <UiText
                text={
                  progress.complete
                    ? "Serie completata"
                    : manga.status === "completed"
                      ? "Pubblicazione conclusa"
                      : manga.status === "ongoing"
                        ? "Serie in corso"
                        : "Totale finale da verificare"
                }
              />
            </span>
          </div>
          {progress.total && (
            <ProgressBar current={progress.count} total={progress.total} showLabel={false} />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <UiText text="La tua edizione (facoltativo)" />
              <UiElement
                as="input"
                className="mt-1 w-full rounded-lg border border-border bg-background p-2"
                value={edition}
                maxLength={100}
                onChange={(e) => setEdition(e.target.value)}
                placeholder="Es. edizione italiana, omnibus…"
              />
            </label>
            <label className="text-sm">
              <UiText text="Totale volumi della tua edizione" />
              <UiElement
                as="input"
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
            <UiText
              text={
                manga.totalVolumes
                  ? `Il catalogo indica ${manga.totalVolumes} volumi per l’edizione originale.`
                  : "Il catalogo non indica ancora un totale definitivo."
              }
            />{" "}
            <UiText text="Puoi indicare il totale della tua edizione: le ristampe e gli omnibus possono avere una numerazione diversa. Una serie in corso non diventa conclusa solo perché hai letto tutti i volumi indicati." />
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <UiText text="Ho letto fino al volume" />
              <UiElement
                as="input"
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
              <UiText text="Segna fino a qui" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            <UiText text="Le copertine disponibili sono preferite nella lingua scelta; se mancano usiamo l’edizione originale. I volumi senza copertina restano numerati." />
          </p>
          {customNumbering && (
            <p className="text-xs text-muted-foreground">
              <UiText text="Per edizioni con numerazione diversa non abbiniamo automaticamente le copertine dell’edizione originale." />
            </p>
          )}
          {covers.isFetching && (
            <p role="status" className="text-xs text-muted-foreground">
              <UiText text="Caricamento copertine dei volumi…" />
            </p>
          )}
          <UiElement
            as="div"
            className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8"
            aria-label="Volumi della serie"
          >
            {Array.from(
              { length: Math.min(48, count - safePage * 48) },
              (_, i) => safePage * 48 + i + 1,
            ).map((n) => (
              <UiElement
                as="button"
                key={n}
                type="button"
                aria-pressed={volumes.includes(n)}
                aria-label={`Volume ${n}${volumes.includes(n) ? ", letto" : ""}`}
                onClick={() => change(n)}
                className={`rounded-md p-1 text-sm transition ${volumes.includes(n) ? "bg-primary/15 ring-2 ring-primary" : "hover:bg-accent"}`}
              >
                <MangaVolumeCover
                  volume={n}
                  url={customNumbering ? undefined : coversByVolume.get(n)?.url}
                />
                <span className="mt-1 block">
                  {n}
                  {volumes.includes(n) ? " ✓" : ""}
                </span>
              </UiElement>
            ))}
          </UiElement>
          {count > 48 && (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                className="button-outline"
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
              >
                <UiText text="Precedenti" />
              </button>
              <span className="text-xs text-muted-foreground">
                {safePage * 48 + 1}–{Math.min(count, (safePage + 1) * 48)} / {count}
              </span>
              <button
                type="button"
                className="button-outline"
                disabled={(safePage + 1) * 48 >= count}
                onClick={() => setPage(safePage + 1)}
              >
                <UiText text="Successivi" />
              </button>
            </div>
          )}
          {!progress.total && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm">
                <UiText text="Vai al volume" />{" "}
                <UiElement
                  as="input"
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
                    setPage(Math.floor((n - 1) / 48));
                  }
                }}
              >
                <UiText text="Segna / deseleziona" />
              </button>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            <UiText
              text={
                progress.next && (!progress.total || progress.next <= progress.total)
                  ? `Prossimo volume da leggere: ${progress.next}.`
                  : "Tutti i volumi indicati sono letti."
              }
            />{" "}
            <UiText text="Premi Salva per confermare le modifiche." />
          </p>
          <button className="button-ink" disabled={busy}>
            <UiText text={busy ? "Salvataggio…" : "Salva avanzamento volumi"} />
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
      <>
        <MangaVolumeGallery book={book} />
        <p className="mt-6 text-sm">
          <Link to="/auth" className="text-primary">
            <UiText text="Accedi" />
          </Link>{" "}
          <UiText text="per tenere traccia dei volumi." />
        </p>
      </>
    );
  if (!item)
    return (
      <>
        <MangaVolumeGallery book={book} />
        <p className="mt-6 text-sm text-muted-foreground">
          <UiText text="Aggiungi la serie alla libreria per segnare i volumi letti." />
        </p>
      </>
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
      <UiText text="Serie manga · " />
      {readVolumes(state).length}
      <UiText text=" volumi letti" />
      {state?.total ? ` / ${state.total}` : ""}
    </p>
  );
}
