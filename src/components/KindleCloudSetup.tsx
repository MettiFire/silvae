import { useEffect, useId, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { UiText } from "@/lib/ui-language-context";
import {
  createKindleWebAttempt,
  inspectKindleReturn,
  type KindleAmazonRegion,
  type KindleWebAttempt,
} from "@/lib/kindle-web-auth";

/** Phase one only: no device credentials, registrations or library mutations. */
export function KindleCloudSetup({ owner }: { owner: string }) {
  const id = useId();
  const [region, setRegion] = useState<KindleAmazonRegion>("it");
  const [attempt, setAttempt] = useState<KindleWebAttempt | null>(null);
  const [returnUrl, setReturnUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [manualCopy, setManualCopy] = useState(false);
  const copyField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!attempt) return;
    const timer = setTimeout(
      () => {
        setAttempt(null);
        setReturnUrl("");
        setMessage("");
        setError("La prova è scaduta. Prepara un nuovo accesso.");
      },
      Math.max(0, attempt.expiresAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [attempt]);
  if (!owner) return null;
  const reset = () => {
    setAttempt(null);
    setReturnUrl("");
    setMessage("");
    setError("");
    setManualCopy(false);
  };
  return (
    <section
      className="rounded-2xl border border-border bg-card p-5"
      aria-labelledby={`${id}-title`}
    >
      <h2 id={`${id}-title`} className="font-display text-xl">
        <UiText text="Kindle · prova di accesso web" />
      </h2>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        <UiText text="Sperimentale: prepariamo l’accesso Amazon nel browser. La registrazione del dispositivo e la sincronizzazione della lettura non sono ancora attive." />
      </p>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        <UiText text="Password e verifica in due passaggi vanno inserite solo su Amazon. Il login tecnico può mostrare Audible." />
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm" htmlFor={`${id}-region`}>
          <UiText text="Account Amazon" />
          <select
            id={`${id}-region`}
            value={region}
            disabled={busy || !!attempt}
            onChange={(event) => setRegion(event.target.value as KindleAmazonRegion)}
            className="min-h-11 rounded-lg border border-border bg-background py-2 pl-3 pr-9"
          >
            <option value="it">Amazon.it</option>
            <option value="com">Amazon.com</option>
          </select>
        </label>
        {!attempt && (
          <button
            type="button"
            className="button-outline min-h-11"
            disabled={busy}
            onClick={async () => {
              reset();
              setBusy(true);
              try {
                setAttempt(await createKindleWebAttempt(region, owner));
              } catch {
                setError("Non è stato possibile preparare l’accesso. Riprova.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <UiText text={busy ? "Preparazione…" : "Prepara accesso Amazon"} />
          </button>
        )}
        {attempt && (
          <>
            <a
              href={attempt.url}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              className="button-ink inline-flex min-h-11 items-center gap-2"
            >
              <UiText text="Apri Amazon" />
              <ExternalLink size={15} aria-hidden="true" />
            </a>
            <button type="button" className="button-outline min-h-11" onClick={reset}>
              <UiText text="Annulla" />
            </button>
            <button
              type="button"
              className="button-outline min-h-11"
              onClick={async () => {
                try {
                  if (!navigator.clipboard?.writeText) throw Error("Clipboard unavailable");
                  await navigator.clipboard.writeText(attempt.url);
                  setMessage(
                    "Link copiato. Incollalo nella barra degli indirizzi di una nuova scheda del browser.",
                  );
                } catch {
                  setManualCopy(true);
                  setMessage(
                    "Seleziona e copia il link dal campo qui sotto, poi incollalo in una nuova scheda del browser.",
                  );
                }
              }}
            >
              <UiText text="Copia link Amazon" />
            </button>
          </>
        )}
      </div>
      {attempt && (
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
          <UiText text="Amazon blocca l’accesso nei riquadri incorporati. Nell’anteprima Lovable usa Copia link Amazon e incollalo nella barra degli indirizzi di una nuova scheda, lasciando aperta Silvae." />
        </p>
      )}
      {attempt && manualCopy && (
        <label className="mt-3 grid min-w-0 gap-1 text-sm" htmlFor={`${id}-copy`}>
          <UiText text="Link Amazon da copiare" />
          <input
            ref={copyField}
            id={`${id}-copy`}
            type="text"
            readOnly
            value={attempt.url}
            onFocus={() => copyField.current?.select()}
            className="min-h-11 min-w-0 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
      )}
      {attempt && (
        <form
          className="mt-5 grid max-w-3xl gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            try {
              inspectKindleReturn(attempt, owner, returnUrl);
              setReturnUrl("");
              setAttempt(null);
              setMessage(
                "Formato dell’indirizzo riconosciuto. Il codice è stato scartato: il collegamento e la sincronizzazione non sono ancora attivi.",
              );
            } catch (failure) {
              setReturnUrl("");
              setError(
                failure instanceof Error
                  ? failure.message
                  : "Amazon non ha restituito un codice utilizzabile.",
              );
            }
          }}
        >
          <p className="text-sm">
            <UiText text="Dopo l’accesso, copia l’indirizzo completo della pagina finale Amazon e incollalo qui. La prova controlla soltanto il formato e scarta il codice; non verifica ancora l’autorizzazione sul server." />
          </p>
          <label htmlFor={`${id}-return`} className="text-sm">
            <UiText text="Indirizzo finale Amazon" />
          </label>
          <input
            id={`${id}-return`}
            value={returnUrl}
            onChange={(event) => setReturnUrl(event.target.value)}
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={16000}
            required
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="button-outline min-h-11 justify-self-start"
            disabled={!returnUrl.trim()}
          >
            <UiText text="Controlla indirizzo di ritorno" />
          </button>
        </form>
      )}
      {message && (
        <p role="status" className="mt-4 text-sm">
          <UiText text={message} />
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          <UiText text={error} />
        </p>
      )}
    </section>
  );
}
