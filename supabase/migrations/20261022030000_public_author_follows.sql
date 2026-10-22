-- Public author follows only; auth metadata, preferences and device credentials stay private.
CREATE TABLE public.author_follows (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 author_id text NOT NULL CHECK(author_id ~ '^OL[0-9]+A$'),
 author_name text NOT NULL CHECK(char_length(btrim(author_name)) BETWEEN 1 AND 160),
 followed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,author_id)
);
CREATE INDEX author_follows_profile ON public.author_follows(user_id,followed_at DESC);
ALTER TABLE public.author_follows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.author_follows FROM anon,authenticated;
GRANT SELECT ON public.author_follows TO anon,authenticated;
CREATE POLICY author_follows_public ON public.author_follows FOR SELECT USING(true);
CREATE FUNCTION public.publish_author_follows(p_user uuid,p_metadata jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE entry jsonb; followed timestamptz; authors jsonb;
BEGIN
 authors=p_metadata->'followed_authors_v1';
 IF jsonb_typeof(authors) IS DISTINCT FROM 'array' THEN authors='[]'::jsonb; END IF;
 DELETE FROM author_follows WHERE user_id=p_user;
 FOR entry IN SELECT value FROM jsonb_array_elements(authors) LIMIT 80 LOOP
   IF jsonb_typeof(entry->'id') IS DISTINCT FROM 'string' OR (entry->>'id') !~ '^OL[0-9]+A$'
      OR jsonb_typeof(entry->'name') IS DISTINCT FROM 'string' OR char_length(btrim(entry->>'name')) NOT BETWEEN 1 AND 160 THEN CONTINUE; END IF;
   BEGIN followed=(entry->>'followedAt')::timestamptz; EXCEPTION WHEN OTHERS THEN followed=NULL; END;
   INSERT INTO author_follows(user_id,author_id,author_name,followed_at) VALUES(p_user,entry->>'id',btrim(entry->>'name'),coalesce(followed,now())) ON CONFLICT DO NOTHING;
 END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.publish_author_follows(uuid,jsonb) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.sync_public_author_follows() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_OP='INSERT' OR NEW.raw_user_meta_data->'followed_authors_v1' IS DISTINCT FROM OLD.raw_user_meta_data->'followed_authors_v1' THEN
  PERFORM publish_author_follows(NEW.id,NEW.raw_user_meta_data);
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.sync_public_author_follows() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER public_author_follows AFTER INSERT OR UPDATE OF raw_user_meta_data ON auth.users FOR EACH ROW EXECUTE FUNCTION public.sync_public_author_follows();
DO $$ DECLARE u record; BEGIN FOR u IN SELECT id,raw_user_meta_data FROM auth.users LOOP PERFORM public.publish_author_follows(u.id,u.raw_user_meta_data); END LOOP; END; $$;
NOTIFY pgrst,'reload schema';

-- Aggregate public scores on the server; never label catalogue scores as community votes.
CREATE INDEX IF NOT EXISTS library_book_read_status ON public.library_items(book_id,status);
CREATE FUNCTION public.book_community_rating(p_book_id text)
RETURNS TABLE(average_rating numeric,ratings_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT avg(rating),count(*) FROM public.library_items
 WHERE book_id=p_book_id AND status='read' AND rating BETWEEN 0 AND 5;
$$;
REVOKE ALL ON FUNCTION public.book_community_rating(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_community_rating(text) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
