import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types";
import { selectDailyFragment } from "./daily-fragment.ts";
import type { Book } from "./books";

/** Alternate catalogue and friends by calendar day, stable across refreshes. */
export function isFriendsFragmentDay(day: string) {
  const date = Date.parse(`${day}T00:00:00Z`);
  return Number.isFinite(date) && Math.floor(date / 86400000) % 2 === 0;
}

export type FriendsDailyFragment = {
  id: string;
  quote: string;
  title: string;
  author: string;
  book: Book;
  sharedBy: { username: string; name: string };
};

/** Ordinary authenticated reads: RLS remains authoritative, no private notes fetched. */
export async function loadFriendsDailyFragment(
  client: SupabaseClient<Database>,
  userId: string,
  day: string,
): Promise<FriendsDailyFragment | null> {
  const follows = await client
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
    .order("following_id")
    .limit(200);
  if (follows.error) throw follows.error;
  const ids = (follows.data ?? []).map((row) => row.following_id).filter((id) => id !== userId);
  if (!ids.length) return null;
  const settings = await client
    .from("fragment_preferences")
    .select("user_id")
    .in("user_id", ids)
    .eq("visibility", "public");
  if (settings.error) throw settings.error;
  const publicIds = (settings.data ?? []).map((row) => row.user_id);
  if (!publicIds.length) return null;
  const fragments = await client
    .from("fragments")
    .select(
      "id,user_id,quote,books(id,title,authors,cover_url,published_year,page_count,categories)",
    )
    .in("user_id", publicIds)
    .eq("kind", "quote")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id")
    .limit(200);
  if (fragments.error) throw fragments.error;
  const candidates = (fragments.data ?? [])
    .flatMap((row) => {
      if (!row.books || !row.quote.trim() || row.quote.length > 1200) return [];
      return [{ ...row, title: row.books.title, author: row.books.authors.join(", ") }];
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  if (!candidates.length) return null;
  // Advance one slot per friends day so alternating days do not skip half the pool.
  const rotationDay = new Date(Math.floor(Date.parse(`${day}T00:00:00Z`) / 172800000) * 86400000)
    .toISOString()
    .slice(0, 10);
  const selected = selectDailyFragment(rotationDay, candidates);
  const profile = await client
    .from("profiles")
    .select("username,display_name")
    .eq("id", selected.user_id)
    .maybeSingle();
  if (profile.error) throw profile.error;
  if (!profile.data?.username) return null;
  return {
    id: selected.id,
    quote: selected.quote,
    title: selected.title,
    author: selected.author,
    book: { ...selected.books!, description: null },
    sharedBy: {
      username: profile.data.username,
      name: profile.data.display_name || profile.data.username,
    },
  };
}
