import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
};

type AuthValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthValue>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  profileLoading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const request = useRef(0);
  const previousUser = useRef<string | null>(null);
  const profileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const ticket = ++request.current;
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, banner_url, bio")
        .eq("id", userId)
        .maybeSingle();
      if (ticket === request.current) setProfile(error ? null : (data as Profile | null));
    } catch {
      if (ticket === request.current) setProfile(null);
    } finally {
      if (ticket === request.current) setProfileLoading(false);
    }
  }, []);
  const switchUser = useCallback(
    (next: Session | null) => {
      if (profileTimer.current) clearTimeout(profileTimer.current);
      const id = next?.user.id ?? null;
      if (previousUser.current !== id) {
        request.current++;
        setProfile(null);
        if (previousUser.current) qc.clear();
        previousUser.current = id;
      }
      // Older accounts can have null metadata; consumers always receive an object.
      setSession(
        next
          ? { ...next, user: { ...next.user, user_metadata: next.user.user_metadata ?? {} } }
          : null,
      );
      setLoading(false);
      if (next?.user) {
        setProfileLoading(true);
        profileTimer.current = setTimeout(() => {
          if (previousUser.current === next.user.id) void loadProfile(next.user.id);
        }, 0);
      } else {
        setProfileLoading(false);
      }
    },
    [qc, loadProfile],
  );

  useEffect(() => {
    let disposed = false;
    let authObserved = false;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      authObserved = true;
      if (!disposed) switchUser(next);
    });
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!disposed && !authObserved) switchUser(data.session);
      })
      .catch(() => {
        if (!disposed && !authObserved) switchUser(null);
      });
    return () => {
      disposed = true;
      if (profileTimer.current) clearTimeout(profileTimer.current);
      request.current++;
      sub.subscription.unsubscribe();
    };
  }, [switchUser]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        profileLoading,
        refreshProfile: async () => {
          if (session?.user) await loadProfile(session.user.id);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
