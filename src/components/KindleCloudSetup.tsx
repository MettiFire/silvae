import { useId, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, LoaderCircle } from "lucide-react";
import { UiText } from "@/lib/ui-language-context";
import { kindleCloud } from "@/lib/kindle-cloud.functions";
import type { KindleRegion, KindleBook } from "@/lib/kindle-cloud";

export function KindleCloudSetup({ owner }: { owner: string }) {
  const id = useId();
  const client = useQueryClient();
  const queryKey = ["kindle-cloud", owner];
  const [region, setRegion] = useState<KindleRegion>("it");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [bookKey, setBookKey] = useState("");
  const [bookType, setBookType] = useState<KindleBook["type"]>("PDOC");
  const query = useQuery({
    queryKey,
    queryFn: () => kindleCloud({ data: { owner, action: "poll" } }),
    enabled: !!owner,
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      query.state.error
        ? false
        : query.state.data?.phase === "pending"
          ? Math.max(3000, Math.min(60_000, query.state.data.nextPollAt - Date.now()))
          : false,
    refetchIntervalInBackground: false,
  });
  const status = query.data;
  const change = async (action: "start" | "disconnect" | "check" | "book") => {
    setBusy(true);
    setError("");
    try {
      await client.cancelQueries({ queryKey });
      const value = await kindleCloud({
        data:
          action === "start"
            ? { owner, action, region }
            : action === "book"
              ? { owner, action, book: { key: bookKey.trim().toUpperCase(), type: bookType } }
              : { owner, action },
      });
      client.setQueryData(queryKey, value);
      await client.invalidateQueries({ queryKey, refetchType: "none" });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Collegamento non riuscito. Riprova.");
    } finally {
      setBusy(false);
    }
  };
  if (!owner) return null;
  return (
    <section
      className="rounded-2xl border border-border bg-card p-5"
      aria-labelledby={`${id}-title`}
    >
      <h2 id={`${id}-title`} className="font-display text-xl">
        Kindle · Amazon
      </h2>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        <UiText text="Collega il tuo account autorizzando un codice direttamente su Amazon." />
      </p>
      {query.isPending && (
        <p className="mt-4 text-sm" role="status">
          <UiText text="Caricamento…" />
        </p>
      )}
      {status?.phase === "unavailable" && (
        <p className="mt-4 text-sm" role="status">
          <UiText text={status.message} />
        </p>
      )}
      {status?.phase === "disconnected" && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm" htmlFor={`${id}-region`}>
            <UiText text="Account Amazon" />
            <select
              id={`${id}-region`}
              value={region}
              disabled={busy}
              onChange={(event) => setRegion(event.target.value as KindleRegion)}
              className="min-h-11 rounded-lg border border-border bg-background py-2 pl-3 pr-9"
            >
              <option value="it">Amazon.it</option>
              <option value="com">Amazon.com</option>
            </select>
          </label>
          <button
            type="button"
            className="button-ink min-h-11"
            disabled={busy}
            onClick={() => void change("start")}
          >
            <UiText text={busy ? "Preparazione…" : "Collega Amazon"} />
          </button>
        </div>
      )}
      {status?.phase === "pending" && (
        <div className="mt-4 space-y-3">
          <p className="text-sm">
            <UiText text="Apri Amazon e inserisci questo codice:" />
          </p>
          <output
            aria-label="Codice Amazon"
            className="block select-all font-mono text-3xl tracking-[0.15em]"
          >
            {status.publicCode}
          </output>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={status.url}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              className="button-ink inline-flex min-h-11 items-center gap-2"
            >
              <UiText text="Autorizza su Amazon" />
              <ExternalLink size={15} aria-hidden="true" />
            </a>
            <button
              type="button"
              className="button-outline min-h-11"
              disabled={busy}
              onClick={() => void change("disconnect")}
            >
              <UiText text="Annulla" />
            </button>
          </div>
          {!query.error && (
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
              <UiText text="In attesa dell’autorizzazione Amazon…" />
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            <UiText text="Il codice scade dopo 10 minuti. Lascia aperta Silvae: il collegamento verrà confermato automaticamente." />
          </p>
        </div>
      )}
      {status?.phase === "connected" && (
        <div className="mt-4 space-y-3">
          <p role="status" className="text-sm">
            <UiText text="Account Amazon collegato" /> · Amazon.{status.region}
          </p>
          <p className="max-w-3xl text-sm text-muted-foreground">
            <UiText
              text={
                status.reading?.message ??
                "Autorizzazione riuscita. Il recupero del progresso Kindle è ancora in verifica: la tua libreria non viene modificata."
              }
            />
          </p>
          <button
            type="button"
            className="button-outline min-h-11"
            disabled={busy}
            onClick={() => void change("disconnect")}
          >
            <UiText text="Scollega Amazon" />
          </button>
          {status.reading && status.reading.status !== "available" && (
            <button
              type="button"
              className="button-outline ml-2 min-h-11"
              disabled={busy}
              onClick={() => void change("check")}
            >
              <UiText text={busy ? "Caricamento…" : "Riprova lettura Kindle"} />
            </button>
          )}
          <details className="border-t border-border pt-3">
            <summary className="cursor-pointer text-sm">
              <UiText text="Verifica un singolo libro · sperimentale" />
            </summary>
            <form
              className="mt-3 grid max-w-xl gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void change("book");
              }}
            >
              <label className="grid gap-1 text-sm" htmlFor={`${id}-book-type`}>
                <UiText text="Tipo di contenuto" />
                <select
                  id={`${id}-book-type`}
                  value={bookType}
                  onChange={(e) => setBookType(e.target.value as KindleBook["type"])}
                  disabled={busy}
                  className="min-h-11 rounded-lg border border-border bg-background py-2 pl-3 pr-9"
                >
                  <option value="PDOC">Send to Kindle</option>
                  <option value="EBOK">Kindle Store</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm" htmlFor={`${id}-book-key`}>
                <UiText text="Identificativo Amazon del libro" />
                <input
                  id={`${id}-book-key`}
                  value={bookKey}
                  onChange={(e) => setBookKey(e.target.value)}
                  required
                  pattern="[A-Za-z0-9]{10,64}"
                  maxLength={64}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={busy}
                  className="min-h-11 rounded-lg border border-border bg-background px-3 py-2 font-mono"
                />
              </label>
              <p className="text-xs text-muted-foreground">
                <UiText text="Test tecnico con l’identificativo del contenuto Amazon. Recupera solo la posizione più avanzata; non aggiorna la libreria Silvae." />
              </p>
              <button
                type="submit"
                disabled={busy}
                className="button-outline min-h-11 justify-self-start"
              >
                <UiText text={busy ? "Caricamento…" : "Verifica posizione"} />
              </button>
            </form>
            {status.bookReading && (
              <div role="status" className="mt-3 space-y-1 text-sm">
                <p>
                  <UiText text={status.bookReading.message} />
                </p>
                {status.bookReading.position !== undefined && (
                  <p>
                    <UiText text="Posizione più avanzata" />: {status.bookReading.position}
                  </p>
                )}
                {status.bookReading.updatedAt !== undefined && (
                  <p>
                    <UiText text="Ultimo aggiornamento Amazon" />:{" "}
                    {new Date(status.bookReading.updatedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </details>
        </div>
      )}
      {(error || query.error) && (
        <div role="alert" className="mt-4 space-y-2 text-sm text-destructive">
          <p>
            <UiText
              text={
                error ||
                (query.error instanceof Error
                  ? query.error.message
                  : "Collegamento non riuscito. Riprova.")
              }
            />
          </p>
          {query.error && (
            <button
              type="button"
              className="button-outline min-h-11"
              disabled={query.isFetching || busy}
              onClick={() => {
                setError("");
                void query.refetch();
              }}
            >
              <UiText text="Riprova" />
            </button>
          )}
        </div>
      )}
      <p className="mt-4 max-w-3xl text-xs text-muted-foreground">
        <UiText text="Sperimentale: Amazon può identificare il dispositivo software come Audible. Password e verifica in due passaggi rimangono su Amazon; non vengono attivati abbonamenti." />
      </p>
    </section>
  );
}
