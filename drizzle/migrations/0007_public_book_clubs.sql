CREATE TABLE public.book_clubs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 name text NOT NULL CHECK(char_length(trim(name)) BETWEEN 3 AND 80),
 description text NOT NULL DEFAULT '' CHECK(char_length(description)<=2000),
 current_book_id text REFERENCES public.books(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.club_members (
 club_id uuid NOT NULL REFERENCES public.book_clubs(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 joined_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(club_id,user_id)
);
CREATE INDEX club_members_user_idx ON public.club_members(user_id,club_id);
CREATE TABLE public.club_topics (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 club_id uuid NOT NULL REFERENCES public.book_clubs(id) ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 book_id text REFERENCES public.books(id) ON DELETE SET NULL,
 title text NOT NULL CHECK(char_length(trim(title)) BETWEEN 3 AND 160),
 body text NOT NULL CHECK(char_length(trim(body)) BETWEEN 1 AND 6000),
 spoiler boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX club_topics_recent_idx ON public.club_topics(club_id,created_at DESC);
CREATE TABLE public.club_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 topic_id uuid NOT NULL REFERENCES public.club_topics(id) ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 body text NOT NULL CHECK(char_length(trim(body)) BETWEEN 1 AND 6000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX club_messages_recent_idx ON public.club_messages(topic_id,created_at,id);
GRANT SELECT ON public.book_clubs TO anon,authenticated;
GRANT SELECT ON public.club_topics,public.club_messages TO authenticated;
GRANT INSERT(club_id,author_id,book_id,title,body,spoiler) ON public.club_topics TO authenticated;
GRANT INSERT(topic_id,author_id,body) ON public.club_messages TO authenticated;
GRANT DELETE ON public.club_topics,public.club_messages TO authenticated;
GRANT DELETE ON public.book_clubs TO authenticated;
GRANT INSERT(owner_id,name,description,current_book_id) ON public.book_clubs TO authenticated;
GRANT UPDATE(name,description,current_book_id) ON public.book_clubs TO authenticated;
GRANT SELECT,DELETE ON public.club_members TO authenticated;
GRANT INSERT(club_id,user_id) ON public.club_members TO authenticated;
GRANT ALL ON public.book_clubs,public.club_members,public.club_topics,public.club_messages TO service_role;
ALTER TABLE public.book_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clubs_read" ON public.book_clubs FOR SELECT USING(true);
CREATE POLICY "clubs_create_own" ON public.book_clubs FOR INSERT TO authenticated WITH CHECK(owner_id=auth.uid());
CREATE POLICY "clubs_edit_owner" ON public.book_clubs FOR UPDATE TO authenticated USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid());
CREATE POLICY "clubs_delete_owner" ON public.book_clubs FOR DELETE TO authenticated USING(owner_id=auth.uid());
CREATE POLICY "club_members_read" ON public.club_members FOR SELECT TO authenticated USING(true);
CREATE POLICY "club_members_join_self" ON public.club_members FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid());
CREATE POLICY "club_members_leave_self" ON public.club_members FOR DELETE TO authenticated USING(user_id=auth.uid() AND NOT EXISTS(SELECT 1 FROM public.book_clubs c WHERE c.id=club_id AND c.owner_id=auth.uid()));
CREATE POLICY "club_topics_read" ON public.club_topics FOR SELECT TO authenticated USING(true);
CREATE POLICY "club_topics_member_write" ON public.club_topics FOR INSERT TO authenticated WITH CHECK(author_id=auth.uid() AND EXISTS(SELECT 1 FROM public.club_members m WHERE m.club_id=club_topics.club_id AND m.user_id=auth.uid()));
CREATE POLICY "club_topics_moderation" ON public.club_topics FOR DELETE TO authenticated USING(author_id=auth.uid() OR EXISTS(SELECT 1 FROM public.book_clubs c WHERE c.id=club_id AND c.owner_id=auth.uid()));
CREATE POLICY "club_messages_read" ON public.club_messages FOR SELECT TO authenticated USING(true);
CREATE POLICY "club_messages_member_write" ON public.club_messages FOR INSERT TO authenticated WITH CHECK(author_id=auth.uid() AND EXISTS(SELECT 1 FROM public.club_topics t JOIN public.club_members m ON m.club_id=t.club_id WHERE t.id=topic_id AND m.user_id=auth.uid()));
CREATE POLICY "club_messages_moderation" ON public.club_messages FOR DELETE TO authenticated USING(author_id=auth.uid() OR EXISTS(SELECT 1 FROM public.club_topics t JOIN public.book_clubs c ON c.id=t.club_id WHERE t.id=topic_id AND c.owner_id=auth.uid()));
CREATE OR REPLACE FUNCTION public.join_created_club() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN INSERT INTO public.club_members(club_id,user_id) VALUES(NEW.id,NEW.owner_id); RETURN NEW; END; $$;
CREATE TRIGGER book_club_owner_membership AFTER INSERT ON public.book_clubs FOR EACH ROW EXECUTE FUNCTION public.join_created_club();
REVOKE ALL ON FUNCTION public.join_created_club() FROM PUBLIC;
NOTIFY pgrst,'reload schema';
