-- Private quotations and a shared foundation for manual/device progress.
CREATE TABLE public.fragments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 book_id text NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
 kind text NOT NULL DEFAULT 'quote' CHECK (kind IN ('quote','note')),
 quote text NOT NULL CHECK (char_length(btrim(quote)) BETWEEN 1 AND 20000),
 note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 10000),
 position text NOT NULL DEFAULT '' CHECK (char_length(position) <= 300),
 tags text[] NOT NULL DEFAULT '{}' CHECK (cardinality(tags) <= 20 AND char_length(array_to_string(tags, ',')) <= 1000),
 favorite boolean NOT NULL DEFAULT false,
 source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','kindle','kobo','bookshelf','csv','readwise','koreader')),
 source_ref text CHECK (char_length(source_ref) <= 500),
 dedupe_key text NOT NULL CHECK (dedupe_key ~ '^[a-f0-9]{64}$'),
 highlighted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 deleted_at timestamptz,
 UNIQUE(user_id,dedupe_key)
);
CREATE INDEX fragments_owner_book ON public.fragments(user_id,book_id,created_at DESC);
ALTER TABLE public.fragments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fragments FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.fragments TO authenticated;
GRANT ALL ON public.fragments TO service_role;
CREATE POLICY fragments_owner ON public.fragments FOR ALL TO authenticated
 USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE FUNCTION public.touch_fragment() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
CREATE TRIGGER fragments_touch BEFORE UPDATE ON public.fragments FOR EACH ROW EXECUTE FUNCTION public.touch_fragment();

ALTER TABLE public.library_items
 ADD COLUMN progress_percent numeric CHECK (progress_percent BETWEEN 0 AND 100),
 ADD COLUMN progress_source text,
 ADD COLUMN progress_updated_at timestamptz,
 ADD COLUMN reading_session_id uuid NOT NULL DEFAULT gen_random_uuid();
CREATE TABLE public.reading_progress_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 book_id text NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
 session_id uuid NOT NULL,
 percentage numeric NOT NULL CHECK (percentage BETWEEN 0 AND 100),
 locator text CHECK (char_length(locator)<=1000),
 source text NOT NULL CHECK (source IN ('manual','kindle','kobo','koreader')),
 external_id text CHECK (char_length(external_id)<=300),
 observed_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,source,external_id)
);
CREATE INDEX progress_events_owner ON public.reading_progress_events(user_id,book_id,observed_at DESC);
ALTER TABLE public.reading_progress_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reading_progress_events FROM anon;
GRANT SELECT,INSERT ON public.reading_progress_events TO authenticated;
GRANT ALL ON public.reading_progress_events TO service_role;
CREATE POLICY progress_events_owner_read ON public.reading_progress_events FOR SELECT TO authenticated USING(auth.uid()=user_id);
CREATE POLICY progress_events_owner_insert ON public.reading_progress_events FOR INSERT TO authenticated WITH CHECK(auth.uid()=user_id);

-- Existing page-based updates remain valid and protect newer manual progress.
CREATE FUNCTION public.track_manual_page_progress() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF (NEW.current_page IS DISTINCT FROM OLD.current_page OR NEW.status IS DISTINCT FROM OLD.status)
    AND NEW.progress_updated_at IS NOT DISTINCT FROM OLD.progress_updated_at THEN
   NEW.progress_percent=CASE WHEN NEW.status='read' THEN 100 WHEN NEW.total_pages>0 THEN least(100,greatest(0,100.0*NEW.current_page/NEW.total_pages)) ELSE NULL END;
   NEW.progress_source='manual'; NEW.progress_updated_at=now();
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER library_manual_progress BEFORE UPDATE ON public.library_items FOR EACH ROW EXECUTE FUNCTION public.track_manual_page_progress();

CREATE FUNCTION public.record_reading_progress(
 p_book_id text,p_percentage numeric,p_observed_at timestamptz,p_source text,
 p_external_id text,p_session_id uuid,p_finished boolean DEFAULT false,p_locator text DEFAULT NULL
) RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE item public.library_items%ROWTYPE; event_id uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF p_percentage IS NULL OR p_percentage<0 OR p_percentage>100 OR p_observed_at IS NULL
    OR p_observed_at>now()+interval '5 minutes' OR (p_finished AND p_percentage<>100) OR p_source NOT IN ('manual','kindle','kobo','koreader') THEN
   RAISE EXCEPTION 'Invalid progress';
 END IF;
 SELECT * INTO item FROM public.library_items WHERE user_id=auth.uid() AND book_id=p_book_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Book not in your library'; END IF;
 INSERT INTO public.reading_progress_events(user_id,book_id,session_id,percentage,locator,source,external_id,observed_at)
 VALUES(auth.uid(),p_book_id,p_session_id,p_percentage,p_locator,p_source,p_external_id,p_observed_at)
 ON CONFLICT(user_id,source,external_id) DO NOTHING RETURNING id INTO event_id;
 IF event_id IS NULL THEN RETURN 'duplicate'; END IF;
 IF p_session_id<>item.reading_session_id THEN RETURN 'old_session'; END IF;
 IF item.progress_updated_at IS NOT NULL AND p_observed_at<=item.progress_updated_at THEN RETURN 'stale'; END IF;
 UPDATE public.library_items SET
   progress_percent=p_percentage,progress_source=p_source,progress_updated_at=p_observed_at,
   status=CASE WHEN p_finished THEN 'read' WHEN item.status='read' THEN 'read' ELSE 'reading' END,
   finished_at=CASE WHEN p_finished THEN coalesce(item.finished_at,p_observed_at) ELSE item.finished_at END,
   started_at=coalesce(item.started_at,p_observed_at),updated_at=now()
 WHERE id=item.id AND user_id=auth.uid();
 RETURN 'applied';
END; $$;
REVOKE ALL ON FUNCTION public.record_reading_progress(text,numeric,timestamptz,text,text,uuid,boolean,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_reading_progress(text,numeric,timestamptz,text,text,uuid,boolean,text) TO authenticated;

CREATE FUNCTION public.start_reading_session(p_book_id text) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE next_session uuid=gen_random_uuid();
BEGIN
 UPDATE public.library_items SET reading_session_id=next_session,progress_percent=0,
  progress_source='manual',progress_updated_at=now(),current_page=0,status='reading',
  started_at=now(),finished_at=NULL,updated_at=now()
 WHERE user_id=auth.uid() AND book_id=p_book_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Book not in your library'; END IF;
 RETURN next_session;
END; $$;
REVOKE ALL ON FUNCTION public.start_reading_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_reading_session(text) TO authenticated;
NOTIFY pgrst,'reload schema';
CREATE FUNCTION public.fragment_books() RETURNS TABLE(id text,title text,authors text[])
 LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT b.id,b.title,b.authors FROM public.books b
 WHERE EXISTS(SELECT 1 FROM public.fragments f WHERE f.book_id=b.id AND f.user_id=auth.uid())
 ORDER BY b.title;
$$;
REVOKE ALL ON FUNCTION public.fragment_books() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fragment_books() TO authenticated;
NOTIFY pgrst,'reload schema';
