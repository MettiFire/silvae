import { useBookLanguage } from "./use-book-language";
import { useAuth } from "./auth";
import { parsePreferences, PREFERENCES_FIELD } from "./reading-preferences";
import { useEffect } from "react";
import { readCatalogueCover, rememberCatalogueCover } from "./book-cover-memory";
import { useQuery, useQueryClient } from "@tanstack/react-query";

/** A session-local presentation choice, separate from bibliographic metadata. */
export const resolvedCoverKey = (bookId: string) => ["resolved-book-cover", bookId] as const;
export function useResolvedBookCover(bookId: string) {
  const client = useQueryClient();
  const { user } = useAuth();
  const { language } = useBookLanguage(
    parsePreferences(user?.user_metadata[PREFERENCES_FIELD])?.language,
  );
  const presentationId = `${bookId}:lang:${language ?? "any"}`;
  const { data } = useQuery<string>({
    queryKey: resolvedCoverKey(presentationId),
    queryFn: () => client.getQueryData<string>(resolvedCoverKey(presentationId)) ?? "",
    enabled: false,
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
  });
  useEffect(() => {
    if (client.getQueryData(resolvedCoverKey(presentationId))) return;
    try {
      const stored = readCatalogueCover(localStorage, presentationId);
      if (stored) client.setQueryData(resolvedCoverKey(presentationId), stored);
    } catch {
      /* Storage can be disabled by the browser. */
    }
  }, [presentationId, client]);
  return {
    cover: data,
    language,
    remember: (url: string) => {
      if (client.getQueryData(resolvedCoverKey(presentationId)) !== url)
        client.setQueryData(resolvedCoverKey(presentationId), url);
      try {
        rememberCatalogueCover(localStorage, presentationId, url);
      } catch {
        /* Optional cache. */
      }
    },
  };
}
