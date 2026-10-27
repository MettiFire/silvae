import { useMangaVolumeCovers } from "@/lib/use-manga-volume-covers";
import { UiText, UiElement } from "@/lib/ui-language-context";
import { MangaVolumeStrip, MangaVolumeGallery, MangaCoverStatus } from "./MangaVolumeCover";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { ProgressBar } from "./ProgressBar";
import { useEffect, useState } from "react";
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
  usesPersonalMangaNumbering,
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
  const [editing, setEditing] = useState(false);
  const [volumes, setVolumes] = useState(() => readVolumes(initial));
  useEffect(() => {
    if (!editing) setVolumes(readVolumes(initial));
  }, [initial, editing]);
  const [jump, setJump] = useState("");
  const [focusVolume, setFocusVolume] = useState(1);
  const [focusTick, setFocusTick] = useState(0);
  const [pendingVolume, setPendingVolume] = useState<number | null>(null);
  const covers = useMangaVolumeCovers(book);
  const manga = book.manga!;
  // Legacy personal numbering remains intact; new entries use catalogue numbering.
  const state = {
    ranges: volumeRanges(volumes),
    total: initial?.total ?? manga.totalVolumes,
    edition: initial?.edition ?? "",
    updatedAt: new Date().toISOString(),
  };
  const progress = mangaCompletion(state, manga);
  const customNumbering = usesPersonalMangaNumbering(initial ?? state, manga);
  const count = Math.min(
    2000,
    Math.max(
      progress.total ?? 20,
      ...volumes,
      ...(!customNumbering && !progress.total ? (covers.data ?? []).map((c) => c.volume) : []),
      progress.total ? 0 : (volumeNumber(jump) ?? 0),
    ),
  );
  const change = (n: number) => {
    if (busy) return;
    if (!volumes.includes(n) && missingPreviousVolumes(volumes, n).length) setPendingVolume(n);
    else setVolumes((old) => selectMangaVolume(old, n));
  };
  return (
    <section
      className={`mt-6 min-w-0 ${editing ? "rounded-xl border border-border bg-card p-4" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">
            <UiText text="I tuoi volumi" />
          </h2>
          {editing && (
            <p className="mt-1 text-xs text-muted-foreground">
              {progress.count}
              {progress.total ? ` / ${progress.total}` : ""} <UiText text="volumi letti" />
              {progress.complete && (
                <>
                  {" "}
                  · <UiText text="Serie completata" />
                </>
              )}
            </p>
          )}
        </div>
        {!editing ? (
          <button type="button" className="button-outline" onClick={() => setEditing(true)}>
            <UiText text="Modifica" />
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              className="button-outline"
              disabled={busy}
              onClick={() => {
                setVolumes(readVolumes(initial));
                setJump("");
                setPendingVolume(null);
                setEditing(false);
              }}
            >
              <UiText text="Annulla" />
            </button>
            <button
              type="button"
              className="button-ink"
              disabled={busy}
              onClick={async () => {
                try {
                  await onSave(state);
                  setEditing(false);
                } catch {
                  // The owner reports save errors; retain the draft for retry.
                }
              }}
            >
              <UiText text={busy ? "Salvataggio…" : "Salva"} />
            </button>
          </div>
        )}
      </div>
      {editing && progress.total && (
        <ProgressBar
          className="mt-3"
          current={progress.count}
          total={progress.total}
          showLabel={false}
        />
      )}
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

      <MangaVolumeStrip
        count={count}
        covers={customNumbering ? [] : (covers.data ?? [])}
        read={volumes}
        {...(editing ? { onToggle: change } : {})}
        disabled={busy}
        focusVolume={focusVolume}
        focusTick={focusTick}
      />
      {!customNumbering && <MangaCoverStatus query={covers} total={progress.total} />}
      {editing && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-2">
            <UiText text="Vai al volume" />
            <UiElement
              as="input"
              aria-label="Volume da segnare"
              type="number"
              min={1}
              max={progress.total ?? 2000}
              value={jump}
              disabled={busy}
              onChange={(e) => setJump(e.target.value)}
              className="w-20 rounded border border-border bg-background px-2 py-1"
            />
          </label>
          <button
            type="button"
            className="button-outline"
            disabled={
              busy ||
              !volumeNumber(jump) ||
              (progress.total !== null && Number(jump) > progress.total)
            }
            onClick={() => {
              const n = volumeNumber(jump);
              if (n) {
                setFocusVolume(n);
                setFocusTick((old) => old + 1);
                change(n);
              }
            }}
          >
            <UiText text="Segna / deseleziona" />
          </button>
          <p className="text-xs text-muted-foreground">
            <UiText text="Seleziona i volumi e premi Salva." />
          </p>
        </div>
      )}
      {customNumbering && (
        <p className="mt-3 text-xs text-muted-foreground">
          <UiText text="Numerazione personale già salvata: i progressi sono conservati senza abbinare copertine di altre edizioni." />
        </p>
      )}
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
      throw e;
    } finally {
      setBusy(false);
    }
  };
  return <MangaVolumeForm key={book.id} book={book} initial={initial} onSave={save} busy={busy} />;
}
