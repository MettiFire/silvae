import { toast } from "@/lib/localized-toast";
import { requireFragmentUser } from "./fragments.ts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cacheBook, type Book } from "@/lib/books";
import { useAuth } from "@/lib/auth";

export type ReadingStatus = "to_read" | "reading" | "read" | "abandoned";

export const STATUS_LABEL: Record<ReadingStatus, string> = {
  to_read: "Da leggere",
  reading: "In lettura",
  read: "Letto",
  abandoned: "Abbandonato",
};

export type LibraryPatch = Partial<Omit<LibraryItem, "books" | "id" | "user_id" | "book_id">>;

export type LibraryItem = {
  id: string;
  user_id: string;
  book_id: string;
  status: ReadingStatus;
  current_page: number;
  progress_percent?: number | null;
  progress_source?: string | null;
  progress_updated_at?: string | null;
  reading_session_id?: string;
  custom_cover_url?: string | null;
  total_pages: number | null;
  rating: number | null;
  favorite: boolean;
  started_at: string | null;
  finished_at: string | null;
  reread_count: number;
  last_reread_at: string | null;
  needs_review: boolean;
  created_at: string;
  updated_at: string;
  books: Book | null;
};

const SELECT = "*, books(id,title,authors,cover_url,published_year,page_count,categories)";
function libraryRows(data: unknown[]) {
  return (data as LibraryItem[]).map((item) => ({
    ...item,
    books: item.books
      ? {
          ...item.books,
          cover_url: item.custom_cover_url || item.books.cover_url,
          custom_cover_url: item.custom_cover_url ?? null,
          description: item.books.description ?? null,
        }
      : null,
  }));
}

export async function logActivity(
  userId: string,
  type: string,
  bookId: string | null,
  metadata: Record<string, unknown> = {},
) {
  await supabase
    .from("activities")
    .insert({ user_id: userId, type, book_id: bookId, metadata: metadata as never });
}

export function useLibrary(userId?: string) {
  return useQuery({
    queryKey: ["library", userId],
    enabled: !!userId,
    queryFn: async ({ signal }) => {
      const items: LibraryItem[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase
          .from("library_items")
          .select(SELECT)
          .eq("user_id", userId!)
          .order("updated_at", { ascending: false })
          .order("id")
          .range(offset, offset + 499)
          .abortSignal(signal);
        if (error) throw error;
        items.push(...libraryRows(data ?? []));
        if ((data?.length ?? 0) < 500) break;
      }
      return items;
    },
  });
}

export function useLibraryItem(bookId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["library-item", user?.id, bookId],
    enabled: !!user && !!bookId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("library_items")
        .select(SELECT)
        .eq("user_id", user!.id)
        .eq("book_id", bookId)
        .maybeSingle();
      if (error) throw error;
      return data ? libraryRows([data])[0]! : null;
    },
  });
}

export function useSaveToLibrary() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      book,
      status,
      extra,
    }: {
      book: Book;
      status: ReadingStatus;
      extra?: LibraryPatch | undefined;
    }) => {
      if (!user) throw new Error("Accedi per gestire la tua libreria");
      await requireFragmentUser(supabase, user.id);
      await cacheBook(book);
      const { data: previous, error: readError } = await supabase
        .from("library_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("book_id", book.id)
        .maybeSingle();
      if (readError) throw readError;
      const now = new Date().toISOString();
      const total = previous?.total_pages ?? book.page_count;
      const { error } = await supabase.from("library_items").upsert(
        {
          user_id: user.id,
          book_id: book.id,
          status,
          total_pages: total,
          started_at: previous?.started_at ?? (status === "reading" ? now : null),
          finished_at: status === "read" ? (previous?.finished_at ?? now) : null,
          current_page:
            status === "read"
              ? (total ?? previous?.current_page ?? 0)
              : (previous?.current_page ?? 0),
          ...extra,
        },
        { onConflict: "user_id,book_id" },
      );
      if (error) throw error;
      await logActivity(
        user.id,
        status === "read" ? "finished" : status === "reading" ? "started" : "added",
        book.id,
        {
          title: book.title,
          status,
        },
      );
    },
    onError: () => toast.error("Modifica non salvata. Controlla la connessione e riprova."),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["library"] });
      void qc.invalidateQueries({ queryKey: ["library-item"] });
      void qc.invalidateQueries({ queryKey: ["community-rating"] });
      void qc.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

export function useUpdateItem() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
      activity,
    }: {
      id: string;
      patch: LibraryPatch;
      activity?: { type: string; bookId: string; metadata?: Record<string, unknown> } | undefined;
    }) => {
      if (!user) throw Error("Accedi per modificare la libreria.");
      await requireFragmentUser(supabase, user.id);
      const { error } = await supabase
        .from("library_items")
        .update(patch)
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id")
        .single();
      if (error) throw error;
      if (activity && user)
        await logActivity(user.id, activity.type, activity.bookId, activity.metadata ?? {});
    },
    onError: () => toast.error("Modifica non salvata. Controlla la connessione e riprova."),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["library"] });
      void qc.invalidateQueries({ queryKey: ["library-item"] });
      void qc.invalidateQueries({ queryKey: ["community-rating"] });
      void qc.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

export function useRemoveItem() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw Error("Accedi per modificare la libreria.");
      await requireFragmentUser(supabase, user.id);
      const { error } = await supabase
        .from("library_items")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id")
        .single();
      if (error) throw error;
    },
    onError: () => toast.error("Modifica non salvata. Controlla la connessione e riprova."),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["library"] });
      void qc.invalidateQueries({ queryKey: ["library-item"] });
      void qc.invalidateQueries({ queryKey: ["community-rating"] });
    },
  });
}
