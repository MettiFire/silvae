import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { fragmentError } from "@/lib/fragments";
import { UiText } from "@/lib/ui-language-context";
import { FragmentCard, type WithBook } from "./Fragments";
const noAction = () => {};
export function ProfileFragments({ userId, own }: { userId: string; own: boolean }) {
  const { user } = useAuth();
  const library = useLibrary(own ? user?.id : undefined);
  const personalCovers = new Map(
    library.data?.map((item) => [item.book_id, item.custom_cover_url]),
  );
  const [page, setPage] = useState(0);
  const list = useQuery({
    queryKey: ["profile-fragments", userId, user?.id, page],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("fragments")
        .select("*, books(*)", { count: "exact" })
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .order("id")
        .range(page * 12, page * 12 + 11);
      if (error) throw error;
      return { rows: (data ?? []) as unknown as WithBook[], count: count ?? 0 };
    },
  });
  return (
    <section className="space-y-4" aria-label="Frammenti">
      {own && (
        <Link to="/fragments" className="inline-block text-sm underline">
          <UiText text="Gestisci i frammenti e la loro visibilità" />
        </Link>
      )}
      {list.isPending ? (
        <p role="status">
          <UiText text="Caricamento dei frammenti…" />
        </p>
      ) : list.isError ? (
        <p role="alert">
          {fragmentError(list.error)}{" "}
          <button onClick={() => void list.refetch()} className="underline">
            <UiText text="Riprova" />
          </button>
        </p>
      ) : !list.data.rows.length ? (
        <p className="text-sm text-muted-foreground">
          <UiText text="Nessun frammento visibile." />
        </p>
      ) : (
        <div className="grid gap-4">
          {list.data.rows.map((fragment) => (
            <FragmentCard
              key={fragment.id}
              fragment={
                personalCovers.get(fragment.book_id) && fragment.books
                  ? {
                      ...fragment,
                      books: {
                        ...fragment.books,
                        cover_url: personalCovers.get(fragment.book_id)!,
                        custom_cover_url: personalCovers.get(fragment.book_id)!,
                      },
                    }
                  : fragment
              }
              readOnly
              onEdit={noAction}
              onTrash={noAction}
              onFavorite={noAction}
            />
          ))}
        </div>
      )}
      {!!list.data?.count && list.data.count > 12 && (
        <div className="flex items-center gap-3">
          <button
            disabled={!page || list.isFetching}
            onClick={() => setPage(page - 1)}
            className="rounded-lg border px-3 py-2 disabled:opacity-40"
          >
            <UiText text="Precedenti" />
          </button>
          <span>
            {page + 1} / {Math.ceil(list.data.count / 12)}
          </span>
          <button
            disabled={(page + 1) * 12 >= list.data.count || list.isFetching}
            onClick={() => setPage(page + 1)}
            className="rounded-lg border px-3 py-2 disabled:opacity-40"
          >
            <UiText text="Successivi" />
          </button>
        </div>
      )}
    </section>
  );
}
