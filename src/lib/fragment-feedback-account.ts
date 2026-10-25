import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types";
import { changeFragmentFeedback, FRAGMENT_FEEDBACK_FIELD } from "./fragment-feedback.ts";
export async function saveFragmentAuthorFeedback(
  client: SupabaseClient<Database>,
  userId: string,
  author: string,
  day: string,
  less: boolean,
) {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (data.user?.id !== userId) throw Error("Accedi di nuovo per salvare la preferenza.");
  const next = changeFragmentFeedback(
    data.user.user_metadata[FRAGMENT_FEEDBACK_FIELD],
    author,
    day,
    less,
  );
  const result = await client.auth.updateUser({ data: { [FRAGMENT_FEEDBACK_FIELD]: next } });
  if (result.error) throw result.error;
  return next;
}
