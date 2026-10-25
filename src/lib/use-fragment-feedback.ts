import { saveFragmentAuthorFeedback } from "./fragment-feedback-account";
import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { supabase } from "@/integrations/supabase/client";
import {
  changeFragmentFeedback,
  parseFragmentFeedback,
  FRAGMENT_FEEDBACK_FIELD,
} from "./fragment-feedback";
import { fragmentDay } from "./daily-fragment";
const GUEST_KEY = "silvae:fragment-author-feedback:guest";
export function useFragmentFeedback() {
  const { user } = useAuth();
  const [guest, setGuest] = useState<ReturnType<typeof parseFragmentFeedback>>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const read = () => {
      try {
        setGuest(parseFragmentFeedback(JSON.parse(localStorage.getItem(GUEST_KEY) ?? "[]")));
      } catch {
        /* Optional local storage. */
      }
    };
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);
  const feedback = user
    ? parseFragmentFeedback(user.user_metadata[FRAGMENT_FEEDBACK_FIELD])
    : guest;
  async function change(author: string, less: boolean) {
    setBusy(true);
    try {
      if (!user) {
        const next = changeFragmentFeedback(guest, author, fragmentDay(), less);
        setGuest(next);
        try {
          localStorage.setItem(GUEST_KEY, JSON.stringify(next));
        } catch {
          /* Keep session preference. */
        }
        return;
      }
      await saveFragmentAuthorFeedback(supabase, user.id, author, fragmentDay(), less);
    } finally {
      setBusy(false);
    }
  }
  return { feedback, busy, change };
}
