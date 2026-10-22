import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ListPlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { requireFragmentUser } from "@/lib/fragments";
import { cacheBook, type Book } from "@/lib/books";

export type BookList = {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  user_id: string;
};

export function useMyLists() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lists", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("book_lists")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BookList[];
    },
  });
}

export function AddToListMenu({ book }: { book: Book }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const { data: lists = [] } = useMyLists();

  const { data: membership = [] } = useQuery({
    queryKey: ["list-membership", user?.id, book.id, lists.map((l) => l.id).join("|")],
    enabled: !!user && lists.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("list_items")
        .select("list_id")
        .eq("book_id", book.id)
        .in(
          "list_id",
          lists.map((l) => l.id),
        );
      if (error) throw error;
      return (data ?? []).map((r) => r.list_id as string);
    },
  });

  const toggle = useMutation({
    mutationFn: async (listId: string) => {
      if (!user) throw Error("Accedi per modificare le liste.");
      await requireFragmentUser(supabase, user.id);
      await cacheBook(book);
      if (membership.includes(listId)) {
        const { error } = await supabase
          .from("list_items")
          .delete()
          .eq("list_id", listId)
          .eq("book_id", book.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("list_items")
          .insert({ list_id: listId, book_id: book.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["list-membership"] });
      void qc.invalidateQueries({ queryKey: ["list-books"] });
      void qc.invalidateQueries({ queryKey: ["profile-lists"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Errore"),
  });

  const createList = useMutation({
    mutationFn: async () => {
      if (!user || !newName.trim()) return;
      await requireFragmentUser(supabase, user.id);
      if (newName.trim().length > 100)
        throw Error("Usa fino a 100 caratteri per il nome della lista.");
      const { data, error } = await supabase
        .from("book_lists")
        .insert({ user_id: user.id, name: newName.trim(), is_public: true })
        .select()
        .single();
      if (error) throw error;
      await cacheBook(book);
      const { error: itemError } = await supabase
        .from("list_items")
        .insert({ list_id: data.id, book_id: book.id });
      if (itemError) {
        await qc.invalidateQueries({ queryKey: ["lists"] });
        throw Error("La lista è stata creata, ma il libro non è stato aggiunto. Riprova dal menu.");
      }
      setNewName("");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["lists"] });
      void qc.invalidateQueries({ queryKey: ["list-membership"] });
      void qc.invalidateQueries({ queryKey: ["profile-lists"] });
      toast.success("Lista creata");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Impossibile creare la lista"),
  });

  const inAny = membership.length > 0;

  if (!user) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium transition hover:bg-accent"
      >
        {inAny ? <Check className="h-4 w-4 text-primary" /> : <ListPlus className="h-4 w-4" />}
        {inAny ? "Aggiunto" : "Aggiungi a lista"}
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-64 rounded-xl border border-border bg-popover p-2 shadow-paper">
          {lists.length === 0 && (
            <p className="px-2 py-2 text-xs text-muted-foreground">Nessuna lista ancora.</p>
          )}
          {lists.map((l) => (
            <button
              key={l.id}
              type="button"
              disabled={toggle.isPending}
              onClick={() => toggle.mutate(l.id)}
              className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm transition hover:bg-accent"
            >
              <span className="truncate">
                {l.name}{" "}
                <span className="text-xs text-muted-foreground">
                  {l.is_public ? "· pubblica" : "· privata"}
                </span>
              </span>
              {membership.includes(l.id) && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
          <div className="mt-2 flex gap-1 border-t border-border pt-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nuova lista…"
              aria-label="Nome nuova lista"
              maxLength={100}
              className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-sm"
            />
            <button
              type="button"
              onClick={() => createList.mutate()}
              disabled={createList.isPending || !newName.trim()}
              aria-label="Crea lista"
              className="rounded-lg bg-primary px-2 text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
