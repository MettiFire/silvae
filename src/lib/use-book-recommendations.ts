import { useBookGridCapacity } from "./use-book-grid-capacity";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { supabase } from "@/integrations/supabase/client";
import { useRecommendationWorkFilter } from "./use-recommendation-work-filter";
import { sameAuthorName } from "./work-identity";
import { searchBooks } from "@/lib/books";
import {
  parsePreferences,
  PREFERENCES_FIELD,
  recommendationSources,
  rankRecommendations,
} from "@/lib/reading-preferences";
import { useBookLanguage } from "@/lib/use-book-language";
import { nextRecommendationRotation } from "@/lib/recommendation-rotation";
export function useBookRecommendations() {
  const recommendationCount = useBookGridCapacity();
  const pageSize = Math.max(12, recommendationCount);
  const { user, loading: authLoading } = useAuth();
  const {
    data: library = [],
    isLoading: libraryLoading,
    isError: libraryError,
    refetch: retryLibrary,
  } = useLibrary(user?.id);
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
  const { language, ready: languageReady } = useBookLanguage(preferences?.language);
  const plan = recommendationSources(preferences, library);
  const planKey = plan.map((g) => g.id).join("|");
  const {
    data: recs = [],
    isFetching: recsLoading,
    isError: recsError,
    refetch: retryRecs,
  } = useQuery({
    queryKey: ["recs-v4", planKey, seed, user?.id, language ?? "any", pageSize],
    enabled:
      seed !== null &&
      languageReady &&
      !authLoading &&
      (!user || (!libraryLoading && !libraryError)),
    queryFn: async () => {
      const lists = await Promise.allSettled(
        plan.map(async (g, index) => {
          const offset = (((seed ?? 0) + index) % 5) * 12;
          let books = await searchBooks(g.query, { max: pageSize, startIndex: offset, language });
          // An author with a small bibliography may not have a later page.
          if (!books.length && offset > 0)
            books = await searchBooks(g.query, { max: pageSize, startIndex: 0, language });
          return books
            .filter((book) => !g.author || book.authors.some((a) => sameAuthorName(a, g.author!)))
            .map((book) => ({ book, genreId: g.genreId }));
        }),
      );
      if (lists.every((r) => r.status === "rejected")) throw new Error("Catalogo non disponibile");
      return lists.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    },
    staleTime: 5 * 60 * 1000,
    // Keep refresh/new-visit rotation, but do not repeat catalogue calls on tab focus.
    refetchOnWindowFocus: false,
  });

  const candidates = useMemo(() => recs.map((r) => r.book), [recs]);
  const excluded = useMemo(
    () => library.flatMap((item) => (item.books ? [item.books] : [])),
    [library],
  );
  const { identities, verifying: worksVerifying } = useRecommendationWorkFilter(
    candidates,
    excluded,
  );
  const libraryReady = !authLoading && (!user || (!libraryLoading && !libraryError));
  const recommended = libraryReady
    ? rankRecommendations(
        recs,
        preferences,
        library,
        dismissed,
        recommendationCount,
        seed ?? 0,
        identities,
      )
    : [];
  return {
    user,
    library,
    preferences,
    language,
    languageReady,
    dismissed,
    recommended,
    recommendationCount,
    recsLoading:
      seed === null ||
      authLoading ||
      (!!user && libraryLoading) ||
      recsLoading ||
      (!recommended.length && worksVerifying),
    recsError: recsError || libraryError,
    libraryReady,
    worksVerifying,
    retryRecs: () => (libraryError ? retryLibrary() : retryRecs()),
    refresh: () => setSeed(nextRecommendationRotation()),
  };
}
