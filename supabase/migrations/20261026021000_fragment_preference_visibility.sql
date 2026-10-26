ALTER POLICY fragment_preferences_read ON public.fragment_preferences USING (
 user_id=(select auth.uid()) OR visibility='public' OR (
  visibility='followers' AND EXISTS (
   SELECT 1 FROM public.follows f WHERE f.following_id=user_id AND f.follower_id=(select auth.uid())
  )
 )
);
NOTIFY pgrst,'reload schema';
