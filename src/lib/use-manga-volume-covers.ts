import { useQuery } from "@tanstack/react-query";
import { mangaCovers } from "./manga-client";
import { useBookLanguage } from "./use-book-language";
import { useAuth } from "./auth";
import { parsePreferences, PREFERENCES_FIELD } from "./reading-preferences";
import type { Book } from "./books";
export function useMangaVolumeCovers(book: Book) {
  const { user } = useAuth();
  const { language } = useBookLanguage(
    parsePreferences(user?.user_metadata[PREFERENCES_FIELD])?.language,
  );
  const id = book.manga?.mangaDexId ?? (book.id.startsWith("manga:md:") ? book.id.slice(9) : null);
  const malId =
    book.manga?.malId ?? (book.id.startsWith("manga:mal:") ? Number(book.id.slice(10)) : null);
  return useQuery({
    queryKey: [
      "manga-volume-covers-v2",
      id,
      malId,
      book.manga?.canonicalTitle ?? book.title,
      language,
    ],
    enabled: !!id || !!malId,
    gcTime: 24 * 60 * 60_000,
    queryFn: ({ signal }) =>
      mangaCovers({
        signal,
        data: {
          ...(id ? { id } : { malId: malId!, title: book.manga?.canonicalTitle ?? book.title }),
          ...(language ? { language } : {}),
        },
      }),
    staleTime: (query) =>
      query.state.data?.length &&
      (!book.manga?.totalVolumes || query.state.data.length >= book.manga.totalVolumes)
        ? 86400000
        : 60000,
    retry: 1,
  });
}
