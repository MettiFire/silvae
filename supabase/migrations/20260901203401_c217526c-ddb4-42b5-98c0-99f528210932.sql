
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  banner_url text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.books (
  id text PRIMARY KEY,
  title text NOT NULL,
  authors text[] NOT NULL DEFAULT '{}',
  cover_url text,
  published_year int,
  page_count int,
  categories text[] NOT NULL DEFAULT '{}',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.books TO anon;
GRANT SELECT, INSERT, UPDATE ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "books_public_read" ON public.books FOR SELECT USING (true);
CREATE POLICY "books_insert_auth" ON public.books FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "books_update_auth" ON public.books FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.library_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  book_id text NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'to_read',
  current_page int NOT NULL DEFAULT 0,
  total_pages int,
  rating numeric(2,1),
  favorite boolean NOT NULL DEFAULT false,
  started_at timestamptz,
  finished_at timestamptz,
  reread_count int NOT NULL DEFAULT 0,
  last_reread_at timestamptz,
  needs_review boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)
);
GRANT SELECT ON public.library_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_items TO authenticated;
GRANT ALL ON public.library_items TO service_role;
ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "library_public_read" ON public.library_items FOR SELECT USING (true);
CREATE POLICY "library_write_own" ON public.library_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  book_id text NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  rating numeric(2,1),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_public_read" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_write_own" ON public.reviews FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.book_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.book_lists TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_lists TO authenticated;
GRANT ALL ON public.book_lists TO service_role;
ALTER TABLE public.book_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lists_read_public_or_own" ON public.book_lists FOR SELECT USING (is_public OR auth.uid() = user_id);
CREATE POLICY "lists_write_own" ON public.book_lists FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.book_lists(id) ON DELETE CASCADE,
  book_id text NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list_id, book_id)
);
GRANT SELECT ON public.list_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.list_items TO authenticated;
GRANT ALL ON public.list_items TO service_role;
ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "list_items_read" ON public.list_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.book_lists l WHERE l.id = list_id AND (l.is_public OR l.user_id = auth.uid()))
);
CREATE POLICY "list_items_write_own" ON public.list_items FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.book_lists l WHERE l.id = list_id AND l.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.book_lists l WHERE l.id = list_id AND l.user_id = auth.uid())
);

CREATE TABLE public.saved_lists (
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  list_id uuid NOT NULL REFERENCES public.book_lists(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, list_id)
);
GRANT SELECT ON public.saved_lists TO anon;
GRANT SELECT, INSERT, DELETE ON public.saved_lists TO authenticated;
GRANT ALL ON public.saved_lists TO service_role;
ALTER TABLE public.saved_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_lists_read" ON public.saved_lists FOR SELECT USING (true);
CREATE POLICY "saved_lists_write_own" ON public.saved_lists FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  year int NOT NULL,
  goal int NOT NULL DEFAULT 12,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, year)
);
GRANT SELECT ON public.challenges TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges TO authenticated;
GRANT ALL ON public.challenges TO service_role;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenges_read" ON public.challenges FOR SELECT USING (true);
CREATE POLICY "challenges_write_own" ON public.challenges FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.follows (
  follower_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);
GRANT SELECT ON public.follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows_read" ON public.follows FOR SELECT USING (true);
CREATE POLICY "follows_write_own" ON public.follows FOR ALL TO authenticated USING (auth.uid() = follower_id) WITH CHECK (auth.uid() = follower_id);

CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  type text NOT NULL,
  book_id text REFERENCES public.books(id) ON DELETE CASCADE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.activities TO anon;
GRANT SELECT, INSERT, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activities_read" ON public.activities FOR SELECT USING (true);
CREATE POLICY "activities_write_own" ON public.activities FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.dismissed_books (
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  book_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, book_id)
);
GRANT SELECT, INSERT, DELETE ON public.dismissed_books TO authenticated;
GRANT ALL ON public.dismissed_books TO service_role;
ALTER TABLE public.dismissed_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dismissed_own" ON public.dismissed_books FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER library_items_updated_at BEFORE UPDATE ON public.library_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)) || '_' || substr(NEW.id::text, 1, 4),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE INDEX library_items_user_idx ON public.library_items(user_id);
CREATE INDEX activities_created_idx ON public.activities(created_at DESC);
CREATE INDEX reviews_book_idx ON public.reviews(book_id);
