import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck, Globe, Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { BookCard } from "@/components/BookCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Book } from "@/lib/books";

export const Route = createFileRoute("/list/$listId")({
  head: () => ({
    meta: [
      { title: "Lista di lettura — Paginae" },
      { name: "description", content: "Una lista di libri curata su Paginae: sfogliala e salvala nel tuo profilo." },
      { property: "og:title", content: "Lista di lettura — Paginae" },
      { property: "og:description", content: "Una lista di libri curata su Paginae." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ListPage,
});

type ListRow = {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  user_id: string;
  created_at: string;
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

function ListPage() {
  const { listId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: list, isLoading } = useQuery({
    queryKey: ["list", listId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("book_lists")
        .select("*, profiles(username, display_name, avatar_url)")
        .eq("id", listId)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as ListRow) ?? null;
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["list-books", listId],
    enabled: !!list,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("list_items")
        .select("id, book_id, books(*)")
        .eq("list_id", listId)
        .order("added_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as { id: string; book_id: string; books: Book | null }[];
    },
  });

  const { data: saved = false } = useQuery({
    queryKey: ["list-saved", user?.id, listId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_lists")
        .select("list_id")
        .eq("user_id", user!.id)
        .eq("list_id", listId)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  const toggleSave = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Accedi per salvare le liste");
      if (saved) {
        const { error } = await supabase.from("saved_lists").delete().eq("user_id", user.id).eq("list_id", listId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("saved_lists").insert({ user_id: user.id, list_id: listId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["list-saved"] });
      void qc.invalidateQueries({ queryKey: ["saved-lists"] });
      toast.success(saved ? "Lista rimossa dai salvati" : "Lista salvata");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Errore"),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("list_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["list-books", listId] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Errore"),
  });

  const isOwner = !!user && list?.user_id === user.id;

  if (isLoading) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Caricamento…</p>
      </AppShell>
    );
  }

  if (!list) {
    return (
      <AppShell>
        <PageHeader title="Lista non trovata" subtitle="La lista non esiste o non è pubblica." />
        <Link to="/discover" className="text-sm text-primary underline">
          Scopri nuovi libri
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title={list.name}
        subtitle={list.description ?? `${items.length} libri`}
        action={
          !isOwner && user ? (
            <button
              type="button"
              onClick={() => toggleSave.mutate()}
              className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium transition hover:bg-accent"
            >
              {saved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
              {saved ? "Salvata" : "Salva lista"}
            </button>
          ) : undefined
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {list.profiles && (
          <Link to="/u/$username" params={{ username: list.profiles.username }} className="hover:text-primary">
            di {list.profiles.display_name ?? list.profiles.username}
          </Link>
        )}
        <span className="flex items-center gap-1">
          {list.is_public ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          {list.is_public ? "Pubblica" : "Privata"}
        </span>
        <span>{items.length} libri</span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessun libro in questa lista.</p>
      ) : (
        <div className="book-grid grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((it) =>
            it.books ? (
              <BookCard
                key={it.id}
                book={it.books}
                footer={
                  isOwner ? (
                    <button
                      type="button"
                      onClick={() => removeItem.mutate(it.id)}
                      aria-label={`Rimuovi ${it.books.title} dalla lista`}
                      className="mt-2 flex items-center gap-1 text-xs text-muted-foreground transition hover:text-primary"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Rimuovi
                    </button>
                  ) : undefined
                }
              />
            ) : null,
          )}
        </div>
      )}
    </AppShell>
  );
}
