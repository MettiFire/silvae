import { pageSeo } from "@/lib/site-seo";
import { useState } from "react";
import { ListEditor } from "@/components/ListEditor";
import { ListBookPicker } from "@/components/ListBookPicker";
import { BookGridSizeControl } from "@/components/BookGridSizeControl";
import { getProfileMap } from "@/lib/profile-data";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck, Globe, Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { BookCard } from "@/components/BookCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Book } from "@/lib/books";

export const Route = createFileRoute("/list/$listId")({
  head: ({ params }) =>
    pageSeo(
      "Lista di lettura — Silvae",
      "Una raccolta di libri curata su Silvae. Sfoglia i titoli di una lista condivisa da un lettore.",
      `/list/${encodeURIComponent(params.listId)}`,
      true,
    ),
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
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const { user } = useAuth();
  const qc = useQueryClient();

  const {
    data: list,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["list", listId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("book_lists")
        .select("*")
        .eq("id", listId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const profiles = await getProfileMap([data.user_id]);
      return { ...data, profiles: profiles.get(data.user_id) ?? null } as ListRow;
    },
  });

  const listBooks = useInfiniteQuery({
    queryKey: ["list-books", listId],
    enabled: !!list,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error, count } = await supabase
        .from("list_items")
        .select(
          "id,book_id,books(id,title,authors,cover_url,published_year,page_count,categories)",
          pageParam === 0 ? { count: "exact" } : {},
        )
        .eq("list_id", listId)
        .order("added_at", { ascending: false })
        .order("id")
        .range(pageParam * 36, pageParam * 36 + 35);
      if (error) throw error;
      return {
        rows: (data ?? []).map((i) => ({
          ...i,
          books: i.books ? { ...i.books, description: null } : null,
        })) as { id: string; book_id: string; books: Book | null }[],
        count,
      };
    },
    getNextPageParam: (last, pages) => (last.rows.length === 36 ? pages.length : undefined),
  });
  const items = listBooks.data?.pages.flatMap((page) => page.rows) ?? [];
  const itemsError = listBooks.isError;
  const itemCount = listBooks.data?.pages[0]?.count ?? items.length;

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
        const { error } = await supabase
          .from("saved_lists")
          .delete()
          .eq("user_id", user.id)
          .eq("list_id", listId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("saved_lists")
          .insert({ user_id: user.id, list_id: listId });
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["list-books", listId] });
      void qc.invalidateQueries({ queryKey: ["profile-lists"] });
      void qc.invalidateQueries({ queryKey: ["list-membership"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Errore"),
  });

  const isOwner = !!user && list?.user_id === user.id;

  if (isError)
    return (
      <AppShell>
        <p role="alert" className="editorial-empty">
          La lista non si è caricata.{" "}
          <button className="underline" onClick={() => void refetch()}>
            Riprova
          </button>
        </p>
      </AppShell>
    );
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
        subtitle={
          list.description ??
          (listBooks.isPending ? "Caricamento dei libri…" : `${itemCount} libri`)
        }
        action={
          isOwner ? (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setEditing(true)} className="button-outline">
                Modifica lista
              </button>
              <button onClick={() => setAdding(true)} className="button-ink">
                + Aggiungi libri
              </button>
            </div>
          ) : !isOwner && user ? (
            <button
              type="button"
              onClick={() => toggleSave.mutate()}
              className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium transition hover:bg-accent"
            >
              {saved ? (
                <BookmarkCheck className="h-4 w-4 text-primary" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
              {saved ? "Salvata" : "Salva lista"}
            </button>
          ) : undefined
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {list.profiles && (
          <Link
            to="/u/$username"
            params={{ username: list.profiles.username }}
            className="hover:text-primary"
          >
            di {list.profiles.display_name ?? list.profiles.username}
          </Link>
        )}
        <span className="flex items-center gap-1">
          {list.is_public ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          {list.is_public ? "Pubblica" : "Privata"}
        </span>
        <span>{itemCount} libri</span>
      </div>

      <div className="mb-5 flex justify-end">
        <BookGridSizeControl />
      </div>
      {itemsError && (
        <p role="alert" className="editorial-empty">
          Non è stato possibile caricare i libri della lista.
        </p>
      )}
      {listBooks.isPending && (
        <p role="status" className="editorial-empty">
          Caricamento dei libri…
        </p>
      )}
      {!listBooks.isPending && !itemsError && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessun libro in questa lista. Usa “Aggiungi libri” oppure aggiungili dalla scheda di un
          libro.
        </p>
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
      {listBooks.hasNextPage && (
        <button
          className="button-outline mt-8"
          disabled={listBooks.isFetchingNextPage}
          onClick={() => void listBooks.fetchNextPage()}
        >
          {listBooks.isFetchingNextPage ? "Caricamento…" : "Mostra altri libri"}
        </button>
      )}
      {editing && <ListEditor list={list} close={() => setEditing(false)} />}
      {adding && (
        <ListBookPicker
          listId={listId}
          existing={items.map((i) => i.book_id)}
          close={() => setAdding(false)}
        />
      )}
    </AppShell>
  );
}
