import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "./auth";
export async function getProfileMap(ids: string[]) {
  const unique = [...new Set(ids)].filter(Boolean);
  const rows: Profile[] = [];
  for (let i = 0; i < unique.length; i += 100) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,username,display_name,avatar_url,banner_url,bio")
      .in("id", unique.slice(i, i + 100));
    if (error) throw error;
    rows.push(...data);
  }
  return new Map(rows.map((p) => [p.id, p]));
}
export { profileShelves, validateProfile } from "./profile-model.ts";
