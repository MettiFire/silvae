-- Sharing is opt-in for the entire collection. Missing settings mean private.
CREATE TABLE public.fragment_preferences (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','followers','public'))
);
ALTER TABLE public.fragment_preferences ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.fragment_preferences TO anon,authenticated;
GRANT INSERT,UPDATE,DELETE ON public.fragment_preferences TO authenticated;
GRANT ALL ON public.fragment_preferences TO service_role;
CREATE POLICY fragment_preferences_read ON public.fragment_preferences FOR SELECT USING (true);
CREATE POLICY fragment_preferences_owner ON public.fragment_preferences FOR ALL TO authenticated
 USING ((select auth.uid())=user_id) WITH CHECK ((select auth.uid())=user_id);

-- Existing owner policy still exclusively controls insert/update/delete.
GRANT SELECT ON public.fragments TO anon;
CREATE POLICY fragments_shared ON public.fragments FOR SELECT TO anon,authenticated
 USING (deleted_at IS NULL AND EXISTS (
  SELECT 1 FROM public.fragment_preferences p WHERE p.user_id=fragments.user_id AND (
   p.visibility='public' OR (p.visibility='followers' AND EXISTS (
    SELECT 1 FROM public.follows f WHERE f.following_id=fragments.user_id AND f.follower_id=(select auth.uid())
   ))
  )
 ));

NOTIFY pgrst,'reload schema';
