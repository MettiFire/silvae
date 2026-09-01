import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ListPlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
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
    queryKey: ["list-membership", user?.id, book.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("list_items").select("list_id").eq("book_id", book.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.list_id as string);
    },
  });

  const toggle = useMutation({
    mutationFn: async (listId: string) => {
      await cacheBook(book);
      if (membership.includes(listId)) {
        const { error } = await supabase.from("list_items").delete().eq("list_id", listId).eq("book_id", book.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("list_items").insert({ list_id: listId, book_id: book.id });
        if (error) throw error;
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["list-membership"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Errore"),
  });

  const createList = useMutation({
    mutationFn: async () => {
      if (!user || !newName.trim()) return;
      const { data, error } = await supabase
        .from("book_lists")
        .insert({ user_id: user.id, name: newName.trim(), is_public: true })
        .select()
        .single();
      if (error) throw error;
      await cacheBook(book);
      await supabase.from("list_items").insert({ list_id: data.id, book_id: book.id });
      setNewName("");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["lists"] });
      void qc.invalidateQueries({ queryKey: ["list-membership"] });
      toast.success("Lista creata");
    },
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
          {lists.length === 0 && <p className="px-2 py-2 text-xs text-muted-foreground">Nessuna lista ancora.</p>}
          {lists.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => toggle.mutate(l.id)}
              className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm transition hover:bg-accent"
            >
              <span className="truncate">
                {l.name} <span className="text-xs text-muted-foreground">{l.is_public ? "· pubblica" : "· privata"}</span>
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
              className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-sm"
            />
            <button
              type="button"
              onClick={() => createList.mutate()}
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
