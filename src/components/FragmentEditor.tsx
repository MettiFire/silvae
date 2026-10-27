import { UiText, UiElement } from "@/lib/ui-language-context";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/localized-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { searchBooks, cacheBook, type Book } from "@/lib/books";
import { supabase } from "@/integrations/supabase/client";
import { fragmentError, saveFragment, type Fragment, type FragmentDraft } from "@/lib/fragments";
import { FragmentTextEditor } from "./FragmentTextEditor";
import { FragmentPhotoField } from "./FragmentPhotoField";
import { prepareImageFile } from "@/lib/profile-images";
import { saveFragmentPhoto } from "@/lib/fragment-photos";
export function FragmentEditor({
  book,
  original,
  close,
}: {
  book?: Book | undefined;
  original?: Fragment | undefined;
  close: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: library = [] } = useLibrary(user?.id);
  const [selected, setSelected] = useState<Book | null>(book ?? null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [draft, setDraft] = useState<FragmentDraft>({
    image_path: original?.image_path ?? null,
    kind: original?.kind === "note" ? "note" : "quote",
    quote: original?.quote ?? "",
    note: original?.note ?? "",
    position: original?.position ?? "",
    tags: original?.tags ?? [],
    favorite: original?.favorite ?? false,
  });
  const [tags, setTags] = useState(draft.tags.join(", "));
  const [submitted, setSubmitted] = useState("");
  const results = useQuery({
    queryKey: ["fragment-book-search", submitted],
    queryFn: () => searchBooks(submitted, { max: 8 }),
    enabled: !!submitted,
    staleTime: 300000,
  });
  const save = async () => {
    if (!user || !selected || busy || editingPhoto) return;
    setBusy(true);
    try {
      await cacheBook(selected);
      const payload = { ...draft, tags: tags.split(",") };
      if (photo || original?.image_path || draft.image_path)
        await saveFragmentPhoto(
          supabase,
          user.id,
          selected.id,
          payload,
          photo ? await prepareImageFile(photo, 2400) : null,
          original,
        );
      else {
        const textPayload = { ...payload };
        delete textPayload.image_path;
        await saveFragment(supabase, user.id, selected.id, textPayload, original);
      }
      await qc.invalidateQueries({ queryKey: ["fragments"] });
      await qc.invalidateQueries({ queryKey: ["fragment-books"] });
      await qc.invalidateQueries({ queryKey: ["profile-fragments"] });
      toast.success(original ? "Frammento aggiornato" : "Frammento salvato");
      close();
    } catch (e) {
      toast.error(fragmentError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
    >
      <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>
            <UiText text={original ? "Modifica frammento" : "Aggiungi un frammento"} />
          </DialogTitle>
          <DialogDescription>
            <UiText text="La visibilità segue l’impostazione della tua raccolta Frammenti." />{" "}
            <UiText
              text={
                selected
                  ? `${selected.title} · ${selected.authors.join(", ")}`
                  : "Scegli il libro a cui appartiene."
              }
            />
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="space-y-4"
        >
          {!book && (
            <fieldset disabled={busy} className="space-y-2">
              <label className="block text-sm">
                <UiText text="Dalla tua libreria" />
                <UiElement
                  as="select"
                  aria-label="Libro del frammento"
                  value={selected?.id ?? ""}
                  onChange={(e) =>
                    setSelected(library.find((i) => i.book_id === e.target.value)?.books ?? null)
                  }
                  className="mt-1 w-full rounded-lg border bg-background p-2"
                >
                  <option value="">
                    <UiText text="Scegli un libro" />
                  </option>
                  {library.map(
                    (i) =>
                      i.books && (
                        <option key={i.book_id} value={i.book_id}>
                          {i.books.title} · {i.books.authors.join(", ")}
                        </option>
                      ),
                  )}
                </UiElement>
              </label>
              <div className="flex gap-2">
                <UiElement
                  as="input"
                  aria-label="Cerca un altro libro"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Oppure cerca un titolo o un autore"
                  className="min-w-0 flex-1 rounded-lg border bg-background p-2 text-sm"
                />
                <button
                  type="button"
                  disabled={search.trim().length < 3 || results.isFetching}
                  onClick={() => setSubmitted(search.trim())}
                  className="rounded-lg border px-3 text-sm"
                >
                  <UiText text="Cerca" />
                </button>
              </div>
              {results.isError && (
                <p role="alert" className="text-sm">
                  <UiText text="Ricerca non disponibile. Riprova." />
                </p>
              )}
              <div className="space-y-1">
                {results.data?.map((b) => (
                  <button
                    type="button"
                    key={b.id}
                    onClick={() => setSelected(b)}
                    aria-pressed={selected?.id === b.id}
                    className={`block w-full rounded-lg border p-2 text-left text-sm ${selected?.id === b.id ? "border-primary bg-accent" : ""}`}
                  >
                    {b.title} · {b.authors.join(", ")}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          <label className="block text-sm">
            <UiText text="Tipo" />
            <select
              disabled={busy}
              value={draft.kind}
              onChange={(e) =>
                setDraft({ ...draft, kind: e.target.value as FragmentDraft["kind"] })
              }
              className="ml-2 rounded-lg border bg-background p-2"
            >
              <option value="quote">
                <UiText text="Citazione" />
              </option>
              <option value="note">
                <UiText text="Nota personale" />
              </option>
            </select>
          </label>
          <FragmentPhotoField
            photo={photo}
            path={draft.image_path ?? null}
            busy={busy}
            onChange={setPhoto}
            onEditingChange={setEditingPhoto}
            onRemove={() => {
              setPhoto(null);
              setDraft({ ...draft, image_path: null });
            }}
          />
          <div className="block text-sm">
            <FragmentTextEditor
              label={
                photo || draft.image_path
                  ? "Didascalia · facoltativa"
                  : draft.kind === "quote"
                    ? "La frase che vuoi conservare"
                    : "Il testo della nota"
              }
              required={!photo && !draft.image_path}
              maxLength={20000}
              disabled={busy}
              value={draft.quote}
              onChange={(quote) => setDraft({ ...draft, quote })}
              rows={5}
            />
          </div>
          <label className="block text-sm">
            <UiText text="Pagina, capitolo o posizione digitale" />
            <UiElement
              as="input"
              maxLength={300}
              disabled={busy}
              value={draft.position}
              onChange={(e) => setDraft({ ...draft, position: e.target.value })}
              placeholder="Es. Pagina 42 oppure posizione 120–125"
              className="mt-1 w-full rounded-lg border bg-background p-2"
            />
          </label>
          <div className="block text-sm">
            <FragmentTextEditor
              label="La tua riflessione · facoltativa"
              maxLength={10000}
              disabled={busy}
              value={draft.note}
              onChange={(note) => setDraft({ ...draft, note })}
              rows={2}
            />
          </div>
          <label className="block text-sm">
            <UiText text="Tag separati da virgole" />
            <UiElement
              as="input"
              disabled={busy}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="memoria, amore, da rileggere"
              className="mt-1 w-full rounded-lg border bg-background p-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              disabled={busy}
              checked={draft.favorite}
              onChange={(e) => setDraft({ ...draft, favorite: e.target.checked })}
            />
            <UiText text="Tra i preferiti" />
          </label>
          <button
            disabled={
              busy ||
              editingPhoto ||
              !selected ||
              (!draft.quote.trim() && !photo && !draft.image_path)
            }
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <UiText text={busy ? "Salvataggio…" : "Salva frammento"} />
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
