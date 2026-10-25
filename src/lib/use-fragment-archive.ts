import { useQuery } from "@tanstack/react-query";
import { loadFragmentArchive } from "./fragment-archive";
import { useUiLanguage } from "./use-ui-language";
export function useFragmentArchive() {
  const { language, ready } = useUiLanguage();
  return useQuery({
    queryKey: ["fragment-archive-v1", language],
    enabled: ready,
    queryFn: () => loadFragmentArchive(language),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
