import { useBookGridCapacity } from "./use-book-grid-capacity";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueries, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
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
  type RecommendationCandidate,
} from "@/lib/reading-preferences";
import { useBookLanguage } from "@/lib/use-book-language";
import { nextRecommendationRotation } from "@/lib/recommendation-rotation";
const combineSources = (results: UseQueryResult<RecommendationCandidate[]>[]) => ({
  recs: results.flatMap((source) => source.data ?? []),
  fetching: results.some((source) => source.isFetching),
  failed: results.length > 0 && results.every((source) => source.isError),
});
export function useBookRecommendations() {
  const qc = useQueryClient();
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
  const sourceQueries = useQueries({
    queries: plan.map((source, index) => {
      const offset = (((seed ?? 0) + index) % 5) * 12;
      return {
        // Cache the actual catalogue page, independently of the visit/rotation counter.
        queryKey: [
          "recommendation-source-v1",
          source.query,
          source.author,
          source.genreId,
          offset,
          language ?? "any",
          pageSize,
        ],
        enabled:
          seed !== null &&
          languageReady &&
          !authLoading &&
          (!user || (!libraryLoading && !libraryError)),
        queryFn: async () => {
          let books = await searchBooks(source.query, {
            max: pageSize,
            startIndex: offset,
            language,
          });
          if (!books.length && offset > 0)
            books = await searchBooks(source.query, { max: pageSize, startIndex: 0, language });
          return books
            .filter(
              (book) =>
                !source.author || book.authors.some((a) => sameAuthorName(a, source.author!)),
            )
            .map((book) => ({ book, genreId: source.genreId }));
        },
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      };
    }),
    combine: combineSources,
  });
  // A slow or unavailable provider must not block results from the other sources.
  const { recs, fetching: recsLoading, failed: recsError } = sourceQueries;
  const retryRecs = () =>
    qc.refetchQueries({ queryKey: ["recommendation-source-v1"], type: "active" });

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
      (recsLoading && !recommended.length) ||
      (!recommended.length && worksVerifying),
    recsError: recsError || libraryError,
    libraryReady,
    worksVerifying,
    retryRecs: () => (libraryError ? retryLibrary() : retryRecs()),
    refresh: () => setSeed(nextRecommendationRotation()),
  };
}
