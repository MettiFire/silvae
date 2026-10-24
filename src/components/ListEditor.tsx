import { UiText, UiElement } from "@/lib/ui-language-context";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/localized-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { requireFragmentUser } from "@/lib/fragments";
import type { BookList } from "./AddToListMenu";
export function ListEditor({
  list,
  close,
  created,
}: {
  list?: BookList;
  close: () => void;
  created?: (id: string) => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState(list?.name ?? "");
  const [description, setDescription] = useState(list?.description ?? "");
  const [isPublic, setPublic] = useState(list?.is_public ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user || busy) return;
    setBusy(true);
    setError("");
    try {
      await requireFragmentUser(supabase, user.id);
      const values = {
        name: name.trim(),
        description: description.trim() || null,
        is_public: isPublic,
      };
      if (!values.name || values.name.length > 100 || description.length > 2000)
        throw Error("Usa un nome da 1 a 100 caratteri e una descrizione fino a 2.000.");
      let id = list?.id;
      if (list) {
        const { data, error } = await supabase
          .from("book_lists")
          .update(values)
          .eq("id", list.id)
          .eq("user_id", user.id)
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
      } else {
        const { data, error } = await supabase
          .from("book_lists")
          .insert({ ...values, user_id: user.id })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["lists"] }),
        qc.invalidateQueries({ queryKey: ["profile-lists"] }),
        qc.invalidateQueries({ queryKey: ["list", id] }),
      ]);
      toast.success(list ? "Lista aggiornata" : "Lista creata");
      close();
      if (!list && id) created?.(id);
    } catch (e) {
      setError((e as Error).message || "Impossibile salvare la lista.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v && !busy) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <UiText text={list ? "Modifica la lista" : "Una nuova lista"} />
          </DialogTitle>
          <DialogDescription>
            <UiText text="Raccogli libri intorno a un’idea. Potrai aggiungerli dalla pagina della lista o dalla scheda di ogni libro." />
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-5">
          <label className="block text-sm">
            <UiText text="Nome della lista" />
            <UiElement
              as="input"
              required
              maxLength={100}
              className="mt-2 w-full rounded border bg-background p-3"
              placeholder="Libri da portare su un’isola"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="block text-sm">
            <UiText text="Una breve descrizione" />
            <textarea
              maxLength={2000}
              rows={3}
              className="mt-2 w-full rounded border bg-background p-3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setPublic(e.target.checked)}
              disabled={busy}
              className="mt-1"
            />
            <span>
              <UiText text="Mostra sul profilo pubblico" />
              <span className="mt-1 block text-xs text-muted-foreground">
                <UiText
                  text={
                    isPublic
                      ? "Gli altri lettori potranno aprire e salvare la lista."
                      : "La lista sarà visibile solo a te."
                  }
                />
              </span>
            </span>
          </label>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <button disabled={busy || !name.trim()} className="button-ink">
            <UiText text={busy ? "Salvataggio…" : list ? "Salva modifiche" : "Crea lista"} />
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
