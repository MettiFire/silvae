import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { coverCandidates, setBookCover, uploadCover, type Book } from "@/lib/books";
import { useAuth } from "@/lib/auth";

export function CoverPicker({ book }: { book: Book }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: options = [], isLoading } = useQuery({
    queryKey: ["cover-options", book.id],
    queryFn: () => coverCandidates(book),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  if (!user) return null;

  async function apply(url: string) {
    setBusy(true);
    try {
      await setBookCover(book.id, url);
      await qc.invalidateQueries({ queryKey: ["book", book.id] });
      await qc.invalidateQueries({ queryKey: ["library"] });
      setOpen(false);
      toast.success("Copertina aggiornata");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Non è stato possibile salvare la copertina");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File) {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Scegli un file immagine");
      return;
    }
    setBusy(true);
    try {
      const url = await uploadCover(user.id, book.id, file);
      await apply(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Caricamento non riuscito");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition hover:bg-accent"
      >
        <ImageIcon className="h-4 w-4" /> Cambia copertina
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Scegli una copertina"
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-background p-5 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold">Scegli una copertina</h2>
              <button
                type="button"
                aria-label="Chiudi"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border p-1.5 transition hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mb-5 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-4 text-sm transition hover:border-primary/50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Upload className="h-4 w-4 text-primary" />}
              {busy ? "Attendi…" : "Carica un'immagine dal tuo dispositivo"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={busy}
                aria-label="Immagine di copertina"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFile(f);
                  e.target.value = "";
                }}
              />
            </label>

            {isLoading && <p className="text-sm text-muted-foreground">Cerco copertine alternative…</p>}
            {!isLoading && options.length === 0 && (
              <p className="text-sm text-muted-foreground">Nessuna copertina alternativa trovata: puoi caricarne una tua.</p>
            )}

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {options.map((url) => (
                <button
                  key={url}
                  type="button"
                  disabled={busy}
                  onClick={() => void apply(url)}
                  className={`overflow-hidden rounded-lg border-2 transition hover:border-primary disabled:opacity-50 ${
                    url === book.cover_url ? "border-primary" : "border-transparent"
                  }`}
                >
                  <img
                    src={url}
                    alt=""
                    loading="lazy"
                    className="aspect-[2/3] w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
