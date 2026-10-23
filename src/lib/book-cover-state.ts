import { useEffect } from "react";
import { readCatalogueCover, rememberCatalogueCover } from "./book-cover-memory";
import { useQuery, useQueryClient } from "@tanstack/react-query";

/** A session-local presentation choice, separate from bibliographic metadata. */
export const resolvedCoverKey = (bookId: string) => ["resolved-book-cover", bookId] as const;
export function useResolvedBookCover(bookId: string) {
  const client = useQueryClient();
  const { data } = useQuery<string>({
    queryKey: resolvedCoverKey(bookId),
    queryFn: () => client.getQueryData<string>(resolvedCoverKey(bookId)) ?? "",
    enabled: false,
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
  });
  useEffect(() => {
    if (client.getQueryData(resolvedCoverKey(bookId))) return;
    try {
      const stored = readCatalogueCover(localStorage, bookId);
      if (stored) client.setQueryData(resolvedCoverKey(bookId), stored);
    } catch {
      /* Storage can be disabled by the browser. */
    }
  }, [bookId, client]);
  return {
    cover: data,
    remember: (url: string) => {
      if (client.getQueryData(resolvedCoverKey(bookId)) !== url)
        client.setQueryData(resolvedCoverKey(bookId), url);
      try {
        rememberCatalogueCover(localStorage, bookId, url);
      } catch {
        /* Optional cache. */
      }
    },
  };
}
