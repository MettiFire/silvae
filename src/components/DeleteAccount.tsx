import { UiText } from "@/lib/ui-language-context";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { deleteOwnAccount } from "@/lib/delete-account";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export function DeleteAccount() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  async function remove() {
    if (!user || pending.current || confirmation !== "ELIMINA") return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await deleteOwnAccount(supabase, user.id, confirmation);
    } catch (e) {
      setError((e as { message?: string })?.message ?? "Impossibile eliminare l’account. Riprova.");
      pending.current = false;
      setBusy(false);
      return;
    }
    // Deletion has committed: a sign-out failure must never invite another deletion.
    await qc.cancelQueries();
    try {
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    } finally {
      qc.clear();
      window.location.replace("/auth?accountDeleted=true");
    }
  }
  return (
    <section className="mt-10 border-t border-destructive/30 pt-6">
      <h2 className="font-display text-2xl">
        <UiText text="Elimina account" />
      </h2>
      <p className="my-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
        <UiText text="Elimina definitivamente il tuo account Silvae e i dati collegati: profilo, libreria, liste, recensioni, frammenti, sfide, autori seguiti e collegamenti ai dispositivi. L’operazione non può essere annullata." />
      </p>
      <button
        type="button"
        disabled={!user}
        onClick={() => {
          setConfirmation("");
          setError("");
          setOpen(true);
        }}
        className="rounded border border-destructive px-4 py-2 text-sm text-destructive disabled:opacity-50"
      >
        <UiText text="Elimina il mio account" />
      </button>
      <AlertDialog
        open={open}
        onOpenChange={(value) => {
          if (!pending.current) setOpen(value);
        }}
      >
        <AlertDialogContent
          onEscapeKeyDown={(e) => {
            if (busy) e.preventDefault();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              <UiText text="Eliminare definitivamente il tuo account?" />
            </AlertDialogTitle>
            <AlertDialogDescription>
              <UiText text="Perderai l’accesso e tutti i tuoi dati personali su Silvae. Questa operazione è irreversibile. Gli account Amazon, Kobo o Google collegati rimangono attivi presso i rispettivi servizi." />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void remove();
            }}
          >
            <label className="block text-sm" htmlFor="delete-account-confirmation">
              <UiText text="Scrivi " />
              <strong>
                <UiText text="ELIMINA" />
              </strong>
              <UiText text=" per confermare" />
            </label>
            <input
              id="delete-account-confirmation"
              value={confirmation}
              disabled={busy}
              autoComplete="off"
              onChange={(e) => setConfirmation(e.target.value)}
              aria-describedby={error ? "delete-account-error" : undefined}
              className="mt-2 w-full rounded border border-border bg-background px-3 py-2"
            />
            {error && (
              <p id="delete-account-error" role="alert" className="mt-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <AlertDialogFooter className="mt-5">
              <AlertDialogCancel disabled={busy}>
                <UiText text="Annulla" />
              </AlertDialogCancel>
              <button
                type="submit"
                disabled={busy || confirmation !== "ELIMINA"}
                className="rounded bg-destructive px-4 py-2 text-sm text-destructive-foreground disabled:opacity-50"
              >
                <UiText text={busy ? "Eliminazione…" : "Elimina definitivamente"} />
              </button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
