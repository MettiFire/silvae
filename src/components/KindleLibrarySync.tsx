import { useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLibrary } from "@/lib/library";
import { UiText, UiDate } from "@/lib/ui-language-context";
import { kindleCloud } from "@/lib/kindle-cloud.functions";
import type { KindleBookReading, KindleCatalogue, KindleCloudStatus } from "@/lib/kindle-cloud";

const control =
  "min-h-11 w-full rounded-lg border border-border bg-background py-2 pl-3 pr-9 text-sm";
const normalize = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export function KindleLibrarySync({
  owner,
  onStatus,
}: {
  owner: string;
  onStatus: (value: KindleCloudStatus) => void;
}) {
  const id = useId();
  const client = useQueryClient();
  const library = useLibrary(owner);
  const [consent, setConsent] = useState(false);
  const [catalogue, setCatalogue] = useState<KindleCatalogue | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  const [libraryId, setLibraryId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [reading, setReading] = useState<KindleBookReading | null>(null);
  const [error, setError] = useState("");
  const book = catalogue?.items.find((item) => `${item.type}:${item.key}` === selected);
  const run = async (action: "catalogue" | "sync") => {
    if (action === "sync" && (!book || !libraryId)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await kindleCloud({
        data:
          action === "catalogue"
            ? { owner, action, consent }
            : { owner, action, book: book!, libraryId, consent },
      });
      onStatus(result);
      if (result.phase === "connected") {
        if (action === "sync") setReading(result.bookReading ?? null);
        if (result.catalogue) setCatalogue(result.catalogue);
        if (result.libraryMessage) setMessage(result.libraryMessage);
        if (action === "sync") {
          await client.invalidateQueries({ queryKey: ["library", owner] });
          await client.invalidateQueries({ queryKey: ["library-item", owner] });
        }
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Collegamento non riuscito. Riprova.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="mt-4 space-y-3 border-t border-border pt-4" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="text-base font-medium">
        <UiText text="Aggiorna dalla raccolta Kindle" />
      </h3>
      <p className="text-sm text-muted-foreground">
        <UiText text="Per cercare i tuoi titoli, Silvae richiede ad Amazon una sessione web temporanea. Passa solo sui server Silvae/Vercel, non viene salvata né inviata al browser. Tecnicamente può dare accesso anche ad altre sezioni dell’account: Silvae la usa solo per la raccolta Kindle, senza leggere ordini o pagamenti." />
      </p>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={consent}
          disabled={busy}
          onChange={(event) => {
            setConsent(event.target.checked);
            if (!event.target.checked) {
              setCatalogue(null);
              setSelected("");
              setLibraryId("");
              setReading(null);
            }
          }}
          className="mt-1"
        />
        <UiText text="Autorizzo l’accesso temporaneo alla raccolta Amazon per cercare i miei libri." />
      </label>
      <button
        type="button"
        className="button-outline min-h-11"
        disabled={!consent || busy}
        onClick={() => void run("catalogue")}
      >
        <UiText
          text={
            busy
              ? "Caricamento…"
              : catalogue
                ? "Aggiorna titoli Amazon"
                : "Carica i miei titoli Amazon"
          }
        />
      </button>
      {catalogue && (
        <form
          className="grid max-w-2xl gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void run("sync");
          }}
        >
          {catalogue.partial && (
            <p className="text-xs text-muted-foreground">
              <UiText text="Sono mostrati i 100 contenuti più recenti per tipo. La raccolta è parziale." />
            </p>
          )}
          {!catalogue.items.length ? (
            <p role="status">
              <UiText text="Nessun titolo Kindle trovato nella raccolta Amazon." />
            </p>
          ) : (
            <>
              <label htmlFor={`${id}-search`} className="grid gap-1 text-sm">
                <UiText text="Cerca nella raccolta Amazon" />
                <input
                  id={`${id}-search`}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={control}
                />
              </label>
              <label htmlFor={`${id}-amazon`} className="grid gap-1 text-sm">
                <UiText text="Libro su Amazon" />
                <select
                  id={`${id}-amazon`}
                  required
                  disabled={busy}
                  value={selected}
                  onChange={(event) => {
                    setSelected(event.target.value);
                    const item = catalogue.items.find(
                      (row) => `${row.type}:${row.key}` === event.target.value,
                    );
                    const matches = item
                      ? library.data?.filter(
                          (row) =>
                            row.books && normalize(row.books.title) === normalize(item.title),
                        )
                      : [];
                    setLibraryId(matches?.length === 1 ? matches[0]!.id : "");
                    setMessage("");
                    setReading(null);
                  }}
                  className={control}
                >
                  <option value="">—</option>
                  {catalogue.items
                    .filter(
                      (item) =>
                        !search ||
                        normalize(`${item.title} ${item.authors.join(" ")}`).includes(
                          normalize(search),
                        ) ||
                        `${item.type}:${item.key}` === selected,
                    )
                    .map((item) => (
                      <option key={`${item.type}:${item.key}`} value={`${item.type}:${item.key}`}>
                        {item.title} · {item.authors.join(", ")}
                      </option>
                    ))}
                </select>
              </label>
              <label htmlFor={`${id}-library`} className="grid gap-1 text-sm">
                <UiText text="Libro corrispondente nella tua libreria Silvae" />
                <select
                  id={`${id}-library`}
                  required
                  disabled={busy || library.isPending}
                  value={libraryId}
                  onChange={(e) => setLibraryId(e.target.value)}
                  className={control}
                >
                  <option value="">—</option>
                  {library.data?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.books?.title ?? item.book_id} · {item.books?.authors?.join(", ")}
                    </option>
                  ))}
                </select>
              </label>
              {library.error && (
                <p role="alert">
                  <UiText text="Libreria non disponibile. Ricarica la pagina." />
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                <UiText text="Controlla l’associazione prima di aggiornare. Silvae salva la percentuale solo quando verificabile; conserva libri già letti e modifiche manuali più recenti." />
              </p>
              <button
                type="submit"
                className="button-ink min-h-11 justify-self-start"
                disabled={busy || !book || !libraryId}
              >
                <UiText text={busy ? "Caricamento…" : "Aggiorna il libro in libreria"} />
              </button>
            </>
          )}
        </form>
      )}
      {reading && (
        <div className="space-y-1 border-t border-border pt-3 text-sm" role="status">
          <p>
            <UiText text="Controllo Amazon" />:{" "}
            <UiDate value={new Date(reading.checkedAt).toISOString()} withTime />
          </p>
          {reading.status === "available" && reading.position !== undefined ? (
            <>
              <p>
                <UiText text="Posizione di lettura Amazon" />: {reading.position}
              </p>
              <p>
                <UiText text="Data della posizione Amazon" />:{" "}
                {reading.updatedAt ? (
                  <UiDate value={new Date(reading.updatedAt).toISOString()} withTime />
                ) : (
                  <UiText text="Non disponibile" />
                )}
              </p>
            </>
          ) : (
            <p>
              <UiText text={reading.message} />
            </p>
          )}
        </div>
      )}
      {message && (
        <p role="status" className="text-sm">
          <UiText text={message} />
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          <UiText text={error} />
        </p>
      )}
    </section>
  );
}
