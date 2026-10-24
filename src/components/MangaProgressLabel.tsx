import { UiText } from "@/lib/ui-language-context";
import { useAuth } from "@/lib/auth";
import { decodeMangaProgress } from "@/lib/manga-account";
import { MANGA_FIELD, readVolumes } from "@/lib/manga-model";

export function MangaProgressLabel({ bookId }: { bookId: string }) {
  const { user } = useAuth();
  const state = decodeMangaProgress(user?.user_metadata[MANGA_FIELD])[bookId];
  return (
    <p className="mt-2 text-xs text-primary">
      <UiText text="Serie manga · " />
      {readVolumes(state).length}
      <UiText text=" volumi letti" />
      {state?.total ? ` / ${state.total}` : ""}
    </p>
  );
}
