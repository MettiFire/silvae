import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import type { LibraryItem } from "@/lib/library";
import { supabase } from "@/integrations/supabase/client";
import { parseProgressPercent, saveManualPercent, progressError } from "@/lib/reading-progress";
import { ProgressBar } from "./ProgressBar";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "./ui/alert-dialog";
export function ReadingProgress({ item }: { item: LibraryItem }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [value, setValue] = useState(
    item.progress_percent != null ? String(item.progress_percent) : "",
  );
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [restart, setRestart] = useState(false);
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["library"] }),
      qc.invalidateQueries({ queryKey: ["library-item"] }),
      qc.invalidateQueries({ queryKey: ["community-rating", item.book_id] }),
    ]);
  const save = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      const percentage = finished ? 100 : parseProgressPercent(value);
      await saveManualPercent(
        supabase,
        user.id,
        item.book_id,
        item.reading_session_id ?? "",
        percentage,
        finished,
      );
      await refresh();
      toast.success("Progresso aggiornato");
    } catch (e) {
      toast.error(progressError(e));
    } finally {
      setBusy(false);
    }
  };
  const start = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || auth.user?.id !== user.id) throw Error("Accedi di nuovo.");
      const { error } = await supabase.rpc("start_reading_session", { p_book_id: item.book_id });
      if (error) throw error;
      await refresh();
      setValue("0");
      setFinished(false);
      setRestart(false);
      toast.success("Nuova lettura iniziata");
    } catch (e) {
      toast.error(progressError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="mt-5 rounded-xl border border-border bg-card p-4">
      <h2 className="font-display font-semibold">Avanzamento percentuale</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Utile per gli ebook: la percentuale resta distinta dalle pagine dell’edizione.
      </p>
      {item.progress_percent != null && (
        <ProgressBar
          className="mt-3"
          current={item.current_page}
          total={item.total_pages ?? 0}
          percentage={item.progress_percent}
        />
      )}
      {item.progress_updated_at && (
        <p className="mt-2 text-xs text-muted-foreground">
          Ultimo aggiornamento: {new Date(item.progress_updated_at).toLocaleString("it-IT")} ·{" "}
          {item.progress_source === "manual" ? "manuale" : item.progress_source}
        </p>
      )}
      <form
        className="mt-3 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm">
            Percentuale{" "}
            <input
              aria-label="Percentuale letta"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0–100"
              disabled={busy || finished}
              className="ml-2 w-24 rounded-lg border bg-background p-2"
            />{" "}
            %
          </label>
          <button
            disabled={busy || !item.reading_session_id}
            className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Salvataggio…" : "Aggiorna percentuale"}
          </button>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={finished}
            disabled={busy}
            onChange={(e) => setFinished(e.target.checked)}
          />
          Ho finito il libro: segna come letto al 100%
        </label>
      </form>
      {!item.reading_session_id && (
        <p className="mt-3 text-xs text-muted-foreground">
          L’aggiornamento percentuale non è ancora disponibile. Puoi continuare ad aggiornare le
          pagine.
        </p>
      )}
      {item.reading_session_id && (
        <button
          disabled={busy}
          onClick={() => setRestart(true)}
          className="mt-4 text-xs text-primary"
        >
          Inizia una nuova lettura da zero
        </button>
      )}
      <AlertDialog
        open={restart}
        onOpenChange={(open) => {
          if (!busy) setRestart(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Iniziare una nuova lettura?</AlertDialogTitle>
            <AlertDialogDescription>
              Il progresso corrente ripartirà da zero e il libro tornerà In lettura. Le citazioni
              rimangono salvate; gli aggiornamenti dei dispositivi relativi alla lettura precedente
              non sostituiranno la nuova.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void start();
              }}
            >
              Inizia nuova lettura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
