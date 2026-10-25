import { UiText, UiElement } from "@/lib/ui-language-context";
import { BackButton } from "@/components/BackButton";
import { pageSeo } from "@/lib/site-seo";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "@/lib/localized-toast";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { authDestination } from "@/lib/auth-destination";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { recovery?: boolean; accountDeleted?: boolean; returnTo?: string } => ({
    ...(search["returnTo"] ? { returnTo: authDestination(search["returnTo"]) } : {}),
    ...(search["recovery"] === true || search["recovery"] === "true" ? { recovery: true } : {}),
    ...(search["accountDeleted"] === true || search["accountDeleted"] === "true"
      ? { accountDeleted: true }
      : {}),
  }),
  head: () =>
    pageSeo(
      "Accedi o registrati — Silvae",
      "Accedi a Silvae con email e password o Google per organizzare libri, letture, liste e citazioni.",
      "/auth",
      true,
    ),
  component: AuthPage,
});
type Mode = "login" | "signup" | "forgot" | "recovery";
function messageFor(error: unknown) {
  const message = (error as { message?: string })?.message ?? "";
  if (/invalid login credentials/i.test(message)) return "Email o password non corrette.";
  if (/email not confirmed/i.test(message))
    return "Conferma prima la tua email usando il link ricevuto.";
  if (/already registered/i.test(message))
    return "Questa email è già registrata. Prova ad accedere.";
  if (/rate limit|too many/i.test(message))
    return "Troppi tentativi. Attendi qualche minuto e riprova.";
  if (/fetch|network/i.test(message))
    return "Connessione non disponibile. Controlla la rete e riprova.";
  return message || "Operazione non riuscita. Riprova.";
}
function AuthPage() {
  const { recovery, accountDeleted, returnTo } = Route.useSearch();
  const destination = authDestination(returnTo);
  const [mode, setMode] = useState<Mode>(recovery ? "recovery" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(
    accountDeleted ? "Il tuo account Silvae e i dati collegati sono stati eliminati." : "",
  );
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { session } = useAuth();
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("recovery");
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (session && !recovery && mode !== "recovery")
      void navigate({ href: destination, replace: true });
  }, [session, navigate, mode, recovery, destination]);
  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setNotice("");
    setPassword("");
    setConfirmation("");
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    if ((mode === "signup" || mode === "recovery") && password !== confirmation) {
      setError("Le password non coincidono.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth?recovery=true`,
        });
        if (error) throw error;
        setNotice(
          "Se l’indirizzo è registrato, riceverai un link per scegliere una nuova password. Controlla anche lo spam.",
        );
      } else if (mode === "recovery") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("Password aggiornata");
        void navigate({ href: destination, replace: true });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) void navigate({ href: destination, replace: true });
        else
          setNotice(
            "Controlla la tua email e apri il link di conferma, poi torna qui per accedere.",
          );
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        void navigate({ href: destination, replace: true });
      }
    } catch (error) {
      setError(messageFor(error));
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth?${new URLSearchParams({ returnTo: destination })}`,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session)
        throw new Error(
          "Accesso Google non completato. Riprova consentendo la finestra di accesso.",
        );
      void navigate({ href: destination, replace: true });
    } catch (error) {
      setError(messageFor(error));
    } finally {
      setBusy(false);
    }
  }
  const titles = {
    login: "Bentornato",
    signup: "Crea il tuo account",
    forgot: "Recupera la password",
    recovery: "Scegli una nuova password",
  };
  const input =
    "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary";
  return (
    <div className="auth-layout">
      <aside className="auth-editorial">
        <Link to="/" className="wordmark">
          <UiText text="Silvae." />
        </Link>
        <div>
          <p className="eyebrow">
            <UiText text="Una vita tra le pagine" />
          </p>
          <h2>
            <UiText text="Ogni lettura" />
            <br />
            <UiText text="lascia un" />
            <br />
            <em>
              <UiText text="segno." />
            </em>
          </h2>
          <p>
            <UiText text="Il tuo diario, le tue raccolte." />
            <br />
            <UiText text="Le persone con cui condividerle." />
          </p>
        </div>
        <span className="eyebrow">
          <UiText text="La prossima storia comincia qui" />
        </span>
      </aside>
      <div className="auth-form-panel">
        <div className="w-full max-w-sm">
          <BackButton className="mb-8" />
          <div>
            <h1 className="font-display text-3xl font-normal tracking-tight">
              <UiText text={titles[mode]} />
            </h1>
            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="mt-4 rounded-lg bg-accent p-3 text-sm">
                {notice}
              </p>
            )}
            <form onSubmit={submit} className="mt-5 space-y-4">
              {mode !== "recovery" && (
                <label className="block space-y-1 text-sm">
                  <span>
                    <UiText text="Email" />
                  </span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={input}
                    disabled={busy}
                  />
                </label>
              )}
              {mode !== "forgot" && (
                <label className="block space-y-1 text-sm">
                  <span>
                    <UiText text="Password" />
                  </span>
                  <input
                    type="password"
                    required
                    minLength={mode === "login" ? 1 : 8}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={input}
                    disabled={busy}
                  />
                </label>
              )}
              {(mode === "signup" || mode === "recovery") && (
                <>
                  <p className="text-xs text-muted-foreground">
                    <UiText text="Usa almeno 8 caratteri." />
                  </p>
                  <label className="block space-y-1 text-sm">
                    <span>
                      <UiText text="Conferma password" />
                    </span>
                    <input
                      type="password"
                      required
                      autoComplete="new-password"
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                      className={input}
                      disabled={busy}
                    />
                  </label>
                </>
              )}
              <button
                disabled={busy}
                type="submit"
                className="h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                <UiText
                  text={
                    busy
                      ? "Attendi…"
                      : {
                          login: "Accedi",
                          signup: "Registrati",
                          forgot: "Invia link di recupero",
                          recovery: "Salva nuova password",
                        }[mode]
                  }
                />
              </button>
            </form>
            {mode === "login" && (
              <button
                disabled={busy}
                onClick={() => switchMode("forgot")}
                className="mt-3 text-sm text-primary"
              >
                <UiText text="Password dimenticata?" />
              </button>
            )}
            {(mode === "login" || mode === "signup") && (
              <>
                <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  <UiText text="oppure" />
                  <span className="h-px flex-1 bg-border" />
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void google()}
                  className="h-11 w-full rounded-lg border border-border bg-background text-sm font-medium hover:bg-accent disabled:opacity-60"
                >
                  <UiText text="Continua con Google" />
                </button>
              </>
            )}
            <UiElement
              as="nav"
              aria-label="Documenti legali"
              className="mt-6 flex flex-wrap justify-center gap-5 text-xs text-muted-foreground"
            >
              <Link to="/privacy" className="underline underline-offset-4">
                <UiText text="Privacy" />
              </Link>
              <Link to="/terms" className="underline underline-offset-4">
                <UiText text="Termini e condizioni" />
              </Link>
            </UiElement>
            {mode !== "recovery" && (
              <p className="mt-5 text-center text-sm text-muted-foreground">
                <UiText text={mode === "login" ? "Non hai un account? " : "Hai già un account? "} />
                <button
                  disabled={busy}
                  onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                  className="font-medium text-primary"
                >
                  <UiText text={mode === "login" ? "Registrati" : "Accedi"} />
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
