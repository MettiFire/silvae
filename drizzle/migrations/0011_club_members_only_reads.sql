CREATE OR REPLACE FUNCTION public.is_club_member(p_club uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.club_members WHERE club_id = p_club AND user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.is_club_member(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_club_member(uuid) TO authenticated;

DROP POLICY IF EXISTS clubs_read ON public.book_clubs;
CREATE POLICY clubs_read ON public.book_clubs FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.book_clubs FROM anon;

DROP POLICY IF EXISTS club_members_read ON public.club_members;
CREATE POLICY club_members_read ON public.club_members FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_club_member(club_id));

DROP POLICY IF EXISTS club_topics_read ON public.club_topics;
CREATE POLICY club_topics_read ON public.club_topics FOR SELECT TO authenticated
USING (public.is_club_member(club_id));

DROP POLICY IF EXISTS club_messages_read ON public.club_messages;
CREATE POLICY club_messages_read ON public.club_messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.club_topics t WHERE t.id = club_messages.topic_id AND public.is_club_member(t.club_id)));