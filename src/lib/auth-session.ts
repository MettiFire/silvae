import type { Session } from "@supabase/supabase-js";

/** Auth responses can omit metadata; consumers always receive safe objects. */
export function normalizeAuthSession(session: Session | null): Session | null {
  if (!session) return null;
  return {
    ...session,
    user: {
      ...session.user,
      user_metadata: session.user.user_metadata ?? {},
      app_metadata: session.user.app_metadata ?? {},
    },
  };
}