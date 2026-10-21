import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { supabase } from "@/integrations/supabase/client";
import { searchBooks } from "@/lib/books";
import {
  parsePreferences,
  PREFERENCES_FIELD,
  recommendationSources,
  rankRecommendations,
} from "@/lib/reading-preferences";
import { nextRecommendationRotation } from "@/lib/recommendation-rotation";
export function useBookRecommendations() {
  const { user, loading: authLoading } = useAuth();
  const { data: library = [], isLoading: libraryLoading } = useLibrary(user?.id);
  const [seed, setSeed] = useState<number | null>(null);
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setSeed(nextRecommendationRotation());
    }
  }, []);

  const { data: dismissed = [] } = useQuery({
    queryKey: ["dismissed", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("dismissed_books")
        .select("book_id")
        .eq("user_id", user!.id);
      return (data ?? []).map((r) => r.book_id as string);
    },
  });

  const preferences = parsePreferences(user?.user_metadata[PREFERENCES_FIELD]);
  const plan = recommendationSources(preferences, library);
  const planKey = plan.map((g) => g.id).join("|");
  const {
    data: recs = [],
    isFetching: recsLoading,
    isError: recsError,
    refetch: retryRecs,
  } = useQuery({
    queryKey: ["recs-v3", planKey, seed, user?.id],
    enabled: seed !== null && !authLoading && (!user || !libraryLoading),
    queryFn: async () => {
      const lists = await Promise.allSettled(
        plan.map(async (g, index) => {
          const offset = (((seed ?? 0) + index) % 5) * 12;
          let books = await searchBooks(g.query, { max: 12, startIndex: offset });
          // An author with a small bibliography may not have a later page.
          if (!books.length && offset > 0)
            books = await searchBooks(g.query, { max: 12, startIndex: 0 });
          return books
            .filter(
              (book) =>
                !g.author ||
                book.authors.some(
                  (a) =>
                    a.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "") ===
                    g.author!.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, ""),
                ),
            )
            .map((book) => ({ book, genreId: g.genreId }));
        }),
      );
      if (lists.every((r) => r.status === "rejected")) throw new Error("Catalogo non disponibile");
      return lists.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const recommended = rankRecommendations(recs, preferences, library, dismissed, 12, seed ?? 0);
  return {
    user,
    library,
    preferences,
    dismissed,
    recommended,
    recsLoading: seed === null || authLoading || (!!user && libraryLoading) || recsLoading,
    recsError,
    retryRecs,
    refresh: () => setSeed(nextRecommendationRotation()),
  };
}
