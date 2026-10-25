import { useQuery } from "@tanstack/react-query";
import { loadFragmentArchive } from "./fragment-archive";
import { useUiLanguage } from "./use-ui-language";
import { useAuth } from "./auth";
import { parsePreferences, PREFERENCES_FIELD } from "./reading-preferences";
import { resolveFragmentLanguages } from "./fragment-languages";
export function useFragmentArchive() {
  const { language, ready } = useUiLanguage();
  const { user, loading } = useAuth();
  const languages = resolveFragmentLanguages(
    parsePreferences(user?.user_metadata[PREFERENCES_FIELD])?.fragmentLanguages,
    language,
  );
  const query = useQuery({
    queryKey: ["fragment-archive-v2", languages.join("|")],
    enabled: ready && !loading,
    queryFn: async () => {
      const results = await Promise.allSettled(languages.map((l) => loadFragmentArchive(l)));
      const pool = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
      if (!pool.length) throw Error("Fragment archive unavailable");
      return pool;
    },
    staleTime: 3600000,
    gcTime: 86400000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return { ...query, languages };
}
