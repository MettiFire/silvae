import { useId, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { UiText, UiDate } from "@/lib/ui-language-context";
import { koboCloud } from "@/lib/kobo-cloud.functions";
import { useLibrary } from "@/lib/library";

export function KoboCloudSetup({ owner }: { owner: string }) {
  const id = useId(),
    qc = useQueryClient(),
    library = useLibrary(owner);
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [bookId, setBookId] = useState(""),
    [libraryId, setLibraryId] = useState("");
  const queryKey = ["kobo-cloud", owner];
  const query = useQuery({
    queryKey,
    queryFn: () => koboCloud({ data: { owner, action: "poll" } }),
    enabled: !!owner,
    retry: false,
    gcTime: 0,
    refetchInterval: (q) =>
      q.state.data?.status.phase === "pending" && !q.state.error
        ? Math.max(10000, q.state.data.status.nextPollAt - Date.now())
        : false,
    refetchIntervalInBackground: false,
  });
  const value = query.data,
    status = value?.status;
  const action = async (kind: "start" | "disconnect" | "sync" | "bind" | "automatic") => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await qc.cancelQueries({ queryKey });
      const next = await koboCloud({
        data: {
          owner,
          action: kind,
          consent,
          ...(kind === "automatic" ? { enabled: !value?.automatic } : {}),
          ...(kind === "bind" ? { bookId, libraryId } : {}),
        },
      });
      qc.setQueryData(queryKey, next);
      if (["sync", "bind"].includes(kind))
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["library"] }),
          qc.invalidateQueries({ queryKey: ["library-item"] }),
          qc.invalidateQueries({ queryKey: ["challenges"] }),
          qc.invalidateQueries({ queryKey: ["statistics"] }),
        ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Collegamento Kobo non riuscito.");
    } finally {
      setBusy(false);
    }
  };
  if (!owner) return null;
  const control =
    "min-h-11 w-full rounded-lg border border-border bg-background py-2 pl-3 pr-9 text-sm";
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="space-y-4 rounded-2xl border border-border bg-card p-5"
    >
      <div>
        <h2 id={`${id}-title`} className="font-display text-xl">
          Kobo
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          <UiText text="Sincronizza i progressi dei libri acquistati su Kobo. Gli EPUB caricati a mano, anche tramite Dropbox o Google Drive, non condividono il progresso con il cloud Kobo." />
        </p>
      </div>
      {query.isPending && (
        <p role="status">
          <UiText text="Caricamento…" />
        </p>
      )}
      {status?.phase === "unavailable" && (
        <p role="status">
          <UiText text={status.message} />
        </p>
      )}
      {status?.phase === "disconnected" && (
        <div className="space-y-3">
          <p className="max-w-3xl text-xs text-muted-foreground">
            <UiText text="Autorizzi un dispositivo software: le credenziali Kobo non sono limitate tecnicamente alla sola lettura. Silvae le usa esclusivamente per leggere raccolta e progressi." />
          </p>
          <label className="flex max-w-3xl items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              disabled={busy}
            />
            <UiText text="Autorizzo Silvae a conservare cifrato il collegamento Kobo e a leggere titoli e progressi della mia raccolta. Password e login rimangono su Kobo." />
          </label>
          <button
            className="button-ink min-h-11"
            disabled={busy || !consent}
            onClick={() => void action("start")}
          >
            <UiText text={busy ? "Preparazione…" : "Collega Kobo"} />
          </button>
        </div>
      )}
      {status?.phase === "pending" && (
        <div className="space-y-3">
          <p>
            <UiText text="Apri Kobo e inserisci questo codice:" />
          </p>
          <output
            aria-label="Codice Kobo"
            className="block select-all font-mono text-3xl tracking-widest"
          >
            {status.code}
          </output>
          <div className="flex flex-wrap gap-3">
            <a
              className="button-ink inline-flex min-h-11 items-center gap-2"
              href={status.url}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
            >
              <UiText text="Autorizza su Kobo" />
              <ExternalLink size={15} aria-hidden="true" />
            </a>
            <button
              className="button-outline min-h-11"
              disabled={busy}
              onClick={() => void action("disconnect")}
            >
              <UiText text="Annulla" />
            </button>
          </div>
          <p role="status" className="text-sm text-muted-foreground">
            <UiText text="In attesa dell’autorizzazione Kobo. Il codice scade dopo 10 minuti; lascia aperta questa pagina." />
          </p>
        </div>
      )}
      {status?.phase === "connected" && (
        <div className="space-y-4">
          <p role="status">
            <UiText text="Account Kobo collegato" />
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              className="button-ink min-h-11"
              disabled={busy}
              onClick={() => void action("sync")}
            >
              <UiText text={busy ? "Caricamento…" : "Sincronizza Kobo"} />
            </button>
            <button
              className="button-outline min-h-11"
              disabled={busy}
              onClick={() => void action("disconnect")}
            >
              <UiText text="Scollega Kobo" />
            </button>
          </div>
          {status.checkedAt && (
            <p className="text-sm text-muted-foreground">
              <UiText text="Ultimo controllo Kobo" />:{" "}
              <UiDate value={new Date(status.checkedAt)} withTime />
            </p>
          )}
          {status.partial && (
            <p role="status" className="text-sm">
              <UiText text="Raccolta parziale: sincronizza di nuovo per caricare gli altri libri." />
            </p>
          )}
          {value?.result && (
            <p role="status" className="text-sm">
              {value.result.changed} <UiText text="libri aggiornati" />
              {value.result.error && (
                <>
                  {" "}
                  · <UiText text="L’ultimo controllo non è riuscito. Riprova." />
                </>
              )}
            </p>
          )}
          <div className="border-t border-border pt-4">
            <p className="mb-3 max-w-3xl text-sm">
              <UiText text="Controlli automatici tre volte al giorno, anche a Silvae chiuso. Le modifiche manuali più recenti e i libri già letti o abbandonati vengono conservati." />
            </p>
            <button
              className="button-outline min-h-11"
              disabled={busy}
              onClick={() => void action("automatic")}
            >
              <UiText
                text={
                  value?.automatic
                    ? "Disattiva sincronizzazione automatica Kobo"
                    : "Attiva sincronizzazione automatica Kobo"
                }
              />
            </button>
          </div>
          {!!status.books.length && (
            <form
              className="space-y-3 border-t border-border pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                void action("bind");
              }}
            >
              <h3 className="font-display text-lg">
                <UiText text="Associa un libro Kobo" />
              </h3>
              <p className="text-xs text-muted-foreground">
                <UiText text="I titoli e autori univoci vengono associati automaticamente. Puoi confermare qui le altre corrispondenze con la tua libreria." />
              </p>
              <label className="grid gap-1 text-sm">
                <UiText text="Libro Kobo" />
                <select
                  required
                  className={control}
                  value={bookId}
                  onChange={(e) => setBookId(e.target.value)}
                  disabled={busy}
                >
                  <option value="">—</option>
                  {status.books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} · {b.authors.join(", ")}
                      {b.percentage === undefined ? "" : ` · ${b.percentage}%`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <UiText text="Libro nella tua libreria" />
                <select
                  required
                  className={control}
                  value={libraryId}
                  onChange={(e) => setLibraryId(e.target.value)}
                  disabled={busy || library.isPending}
                >
                  <option value="">—</option>
                  {library.data?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.books?.title ?? b.book_id} · {b.books?.authors.join(", ")}
                    </option>
                  ))}
                </select>
              </label>
              {library.error && (
                <p role="alert">
                  <UiText text="Libreria non disponibile. Ricarica la pagina." />
                </p>
              )}
              <button
                type="submit"
                className="button-outline min-h-11"
                disabled={busy || !bookId || !libraryId}
              >
                <UiText text="Conferma associazione e aggiorna" />
              </button>
            </form>
          )}
        </div>
      )}
      {(error || query.error) && (
        <div role="alert" className="space-y-2 text-sm text-destructive">
          <p>
            <UiText
              text={
                error ||
                (query.error instanceof Error
                  ? query.error.message
                  : "Collegamento Kobo non riuscito.")
              }
            />
          </p>
          {query.error && (
            <button
              className="button-outline min-h-11"
              disabled={busy || query.isFetching}
              onClick={() => void query.refetch()}
            >
              <UiText text="Riprova" />
            </button>
          )}
        </div>
      )}
      <p className="max-w-3xl text-xs text-muted-foreground">
        <UiText text="Collegamento sperimentale indipendente, non affiliato a Kobo o StoryGraph. Silvae legge solo la raccolta e i progressi; non acquista, scarica o modifica libri su Kobo. Scollegando interrompi gli accessi di Silvae." />
      </p>
    </section>
  );
}
