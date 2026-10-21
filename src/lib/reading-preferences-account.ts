import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types";
import {
  parsePreferences,
  PREFERENCES_FIELD,
  type ReadingPreferences,
} from "./reading-preferences.ts";
export async function saveReadingPreferences(
  client: SupabaseClient<Database>,
  userId: string,
  value: ReadingPreferences,
) {
  const preferences = parsePreferences(value);
  if (!preferences) throw new Error("Gusti non validi.");
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (data.user?.id !== userId) throw new Error("Accedi di nuovo per salvare i tuoi gusti.");
  const { error: updateError } = await client.auth.updateUser({
    data: { [PREFERENCES_FIELD]: preferences },
  });
  if (updateError) throw updateError;
}
