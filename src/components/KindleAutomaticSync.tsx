import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { kindleAutomatic } from "@/lib/kindle-automatic.functions";
import { UiText, UiDate } from "@/lib/ui-language-context";
export function KindleAutomaticSync({ owner }: { owner: string }) {
  const client = useQueryClient(),
    queryKey = ["kindle-automatic", owner];
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const status = await kindleAutomatic({ data: { owner } });
      if (status.result) {
        void client.invalidateQueries({ queryKey: ["library", owner] });
        void client.invalidateQueries({ queryKey: ["library-item", owner] });
      }
      return status;
    },
    gcTime: 0,
    retry: false,
    refetchInterval: (q) => (q.state.data?.enabled ? 60_000 : false),
    refetchIntervalInBackground: false,
  });
  const change = async (enabled: boolean) => {
    setBusy(true);
    setError("");
    try {
      const value = await kindleAutomatic({ data: { owner, enabled, consent } });
      client.setQueryData(queryKey, value);
    } catch (f) {
      setError(f instanceof Error ? f.message : "Aggiornamento non riuscito.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="mt-4 space-y-3 border-t border-border pt-4">
      <h3 className="text-base font-medium">
        <UiText text="Sincronizzazione automatica" />
      </h3>
      <p className="text-sm text-muted-foreground">
        <UiText text="Silvae controlla Amazon sul server anche a sito chiuso, tre volte al giorno, circa ogni 8 ore. Il Kindle deve prima sincronizzarsi con Amazon. Le associazioni certe vengono aggiornate; quelle dubbie richiedono conferma. La percentuale viene salvata soltanto se verificabile, senza stimarla dalle pagine." />
      </p>
      {query.data?.enabled ? (
        <>
          <p role="status" className="text-sm">
            <UiText text="Sincronizzazione automatica attiva" />
          </p>
          <button
            type="button"
            disabled={busy}
            className="button-outline min-h-11"
            onClick={() => void change(false)}
          >
            <UiText text="Disattiva sincronizzazione automatica" />
          </button>
        </>
      ) : (
        <>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={consent}
              disabled={busy}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <UiText text="Autorizzo i controlli periodici della raccolta e gli aggiornamenti automatici della mia libreria anche quando Silvae è chiuso. Posso disattivarli qui in qualsiasi momento." />
          </label>
          <button
            type="button"
            className="button-outline min-h-11"
            disabled={busy || !consent || query.isPending || !!query.error}
            onClick={() => void change(true)}
          >
            <UiText text="Attiva sincronizzazione automatica" />
          </button>
        </>
      )}
      {query.data?.result && (
        <div role="status" className="space-y-1 text-sm text-muted-foreground">
          <p>
            <UiText text="Ultimo controllo" />:{" "}
            <UiDate value={query.data.result.checkedAt} withTime />
          </p>
          <p>
            <UiText text="Libri aggiornati" />: {query.data.result.changed} ·{" "}
            <UiText text="Percentuali non disponibili" />: {query.data.result.unknown} ·{" "}
            <UiText text="Associazioni da confermare" />: {query.data.result.unmatched}
          </p>
          {query.data.result.error && (
            <p>
              <UiText text="Amazon non era disponibile. Il controllo verrà riprovato senza modificare i dati esistenti." />
            </p>
          )}
        </div>
      )}
      {(error || query.error) && (
        <p role="alert" className="text-sm text-destructive">
          <UiText
            text={
              error ||
              (query.error instanceof Error
                ? query.error.message
                : "Sincronizzazione non disponibile.")
            }
          />
        </p>
      )}
    </section>
  );
}
