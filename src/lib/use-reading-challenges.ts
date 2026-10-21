import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { loadReadingChallenges, changeReadingChallenge } from "./challenge-account";
import type { ChallengeEnrollment, ChallengeId } from "./reading-challenges";

// Compact personal options/associations are saved to the existing authenticated
// account. Public award catalogues stay in code; no database migration is needed.
export function useReadingChallenges(userId?: string) {
  const qc = useQueryClient();
  const queryKey = ["reading-challenges", userId];
  const query = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: () => loadReadingChallenges(supabase, userId!),
  });
  const mutation = useMutation({
    mutationFn: (change: { save: ChallengeEnrollment } | { remove: ChallengeId }) => {
      if (!userId) throw new Error("Accedi per gestire le sfide.");
      return changeReadingChallenge(supabase, userId, change);
    },
    onSuccess: (next) => qc.setQueryData(queryKey, next),
  });
  return {
    ...query,
    enrollments: query.data ?? [],
    save: (entry: ChallengeEnrollment) => mutation.mutateAsync({ save: entry }),
    leave: (id: ChallengeId) => mutation.mutateAsync({ remove: id }),
    saving: mutation.isPending,
  };
}
