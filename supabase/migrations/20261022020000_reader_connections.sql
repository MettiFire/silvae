-- Device credentials authorize only incoming reading metadata, never library reads.
CREATE TABLE public.reader_connections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 name text NOT NULL CHECK(char_length(btrim(name)) BETWEEN 1 AND 80),
 kind text NOT NULL CHECK(kind IN ('kindle','kobo','koreader')),
 mode text NOT NULL CHECK(mode IN ('usb','wifi')),
 created_at timestamptz NOT NULL DEFAULT now(), last_received_at timestamptz, revoked_at timestamptz,
 CHECK((kind='koreader' AND mode='wifi') OR (kind IN ('kindle','kobo') AND mode='usb'))
);
CREATE TABLE public.reader_credentials (
 connection_id uuid PRIMARY KEY REFERENCES public.reader_connections(id) ON DELETE CASCADE,
 credential_hash text NOT NULL
);
CREATE TABLE public.reader_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), connection_id uuid NOT NULL REFERENCES public.reader_connections(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 external_id text NOT NULL CHECK(char_length(external_id) BETWEEN 1 AND 500),
 title text NOT NULL DEFAULT '' CHECK(char_length(title)<=500), authors text[] NOT NULL DEFAULT '{}',
 book_id text REFERENCES public.books(id) ON DELETE SET NULL, session_id uuid, confirmed_manual_at timestamptz,
 progress_payload jsonb, last_received_at timestamptz NOT NULL DEFAULT now(),
 result text NOT NULL DEFAULT 'unmapped', UNIQUE(connection_id,external_id)
);
CREATE TABLE public.reader_annotations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_id uuid NOT NULL REFERENCES public.reader_documents(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 external_id text NOT NULL CHECK(char_length(external_id) BETWEEN 1 AND 500),
 quote text NOT NULL CHECK(char_length(btrim(quote)) BETWEEN 1 AND 20000),
 note text NOT NULL DEFAULT '' CHECK(char_length(note)<=10000), position text NOT NULL DEFAULT '' CHECK(char_length(position)<=300),
 kind text NOT NULL DEFAULT 'quote' CHECK(kind IN ('quote','note')),
 UNIQUE(document_id,external_id)
);
ALTER TABLE public.reader_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reader_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reader_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reader_annotations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reader_connections,public.reader_credentials,public.reader_documents,public.reader_annotations FROM anon,authenticated;
GRANT SELECT ON public.reader_connections,public.reader_documents TO authenticated;
CREATE POLICY reader_connection_owner ON public.reader_connections FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY reader_document_owner ON public.reader_documents FOR SELECT TO authenticated USING(user_id=auth.uid());

CREATE FUNCTION public.create_reader_connection(p_name text,p_kind text,p_secret text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE cid uuid; credential text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF p_secret IS NULL OR p_secret !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid secret'; END IF;
 IF (SELECT count(*) FROM reader_connections WHERE user_id=auth.uid() AND revoked_at IS NULL)>=10 THEN RAISE EXCEPTION 'Puoi collegare al massimo 10 dispositivi.'; END IF;
 credential=CASE WHEN p_kind='koreader' THEN md5(p_secret) ELSE p_secret END;
 INSERT INTO reader_connections(user_id,name,kind,mode) VALUES(auth.uid(),p_name,p_kind,CASE WHEN p_kind='koreader' THEN 'wifi' ELSE 'usb' END) RETURNING id INTO cid;
 INSERT INTO reader_credentials VALUES(cid,encode(sha256(convert_to(credential,'UTF8')),'hex'));
 RETURN cid;
END; $$;
CREATE FUNCTION public.revoke_reader_connection(p_connection uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 UPDATE reader_connections SET revoked_at=now() WHERE id=p_connection AND user_id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'Device not found'; END IF;
END; $$;

-- Internal helper, never executable by API roles. Serializes ingestion/revocation.
CREATE FUNCTION public.check_reader_credential(p_connection uuid,p_credential text) RETURNS public.reader_connections
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c public.reader_connections;
BEGIN
 IF p_credential IS NULL OR char_length(p_credential)>128 THEN RAISE EXCEPTION 'Invalid device credential'; END IF;
 SELECT * INTO c FROM reader_connections WHERE id=p_connection AND revoked_at IS NULL FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM reader_credentials WHERE connection_id=p_connection AND credential_hash=encode(sha256(convert_to(p_credential,'UTF8')),'hex')) THEN RAISE EXCEPTION 'Invalid device credential'; END IF;
 RETURN c;
END; $$;
CREATE FUNCTION public.apply_reader_document(p_document uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE d public.reader_documents; c public.reader_connections; item public.library_items; payload jsonb;
 v_result text='annotations_only'; event_id uuid; observed timestamptz; percent numeric;
BEGIN
 SELECT * INTO d FROM reader_documents WHERE id=p_document FOR UPDATE;
 SELECT * INTO c FROM reader_connections WHERE id=d.connection_id;
 IF d.book_id IS NULL THEN RETURN 'unmapped'; END IF;
 SELECT * INTO item FROM library_items WHERE user_id=d.user_id AND book_id=d.book_id FOR UPDATE;
 IF NOT FOUND THEN v_result='missing_library';
 ELSE
   INSERT INTO fragments(user_id,book_id,kind,quote,note,position,source,source_ref,dedupe_key)
   SELECT d.user_id,d.book_id,a.kind,a.quote,a.note,a.position,c.kind,
     'reader:'||encode(sha256(convert_to(d.external_id||':'||a.external_id,'UTF8')),'hex'),
     encode(sha256(convert_to(jsonb_build_array(d.book_id,c.kind,d.external_id,a.external_id)::text,'UTF8')),'hex')
   FROM reader_annotations a WHERE a.document_id=d.id
   ON CONFLICT(user_id,dedupe_key) DO NOTHING;
   payload=d.progress_payload;
   IF payload IS NOT NULL AND payload->>'percentage' IS NOT NULL THEN
     observed=(payload->>'observed_at')::timestamptz; percent=(payload->>'percentage')::numeric;
     IF d.session_id IS DISTINCT FROM item.reading_session_id THEN v_result='old_session';
     ELSIF observed IS NULL THEN v_result='missing_time';
     ELSIF c.kind='koreader' AND item.progress_source='manual' AND item.progress_updated_at IS DISTINCT FROM d.confirmed_manual_at THEN v_result='manual_conflict';
     ELSE
       INSERT INTO reading_progress_events(user_id,book_id,session_id,percentage,locator,source,external_id,observed_at)
       VALUES(d.user_id,d.book_id,d.session_id,percent,payload->>'locator',c.kind,
         encode(sha256(convert_to(c.id::text||':'||d.external_id||':'||(payload->>'event_id'),'UTF8')),'hex'),observed)
       ON CONFLICT(user_id,source,external_id) DO NOTHING RETURNING id INTO event_id;
       IF event_id IS NULL THEN v_result='duplicate';
       ELSIF item.progress_updated_at IS NOT NULL AND observed<=item.progress_updated_at THEN v_result='stale';
       ELSE
         UPDATE library_items SET progress_percent=percent,progress_source=c.kind,progress_updated_at=observed,
           status=CASE WHEN coalesce((payload->>'finished')::boolean,false) THEN 'read' WHEN item.status='read' THEN 'read' ELSE 'reading' END,
           finished_at=CASE WHEN coalesce((payload->>'finished')::boolean,false) THEN coalesce(item.finished_at,observed) ELSE item.finished_at END,
           started_at=coalesce(item.started_at,observed),updated_at=now()
         WHERE id=item.id AND user_id=d.user_id;
         v_result='applied';
       END IF;
     END IF;
   END IF;
 END IF;
 UPDATE reader_documents SET result=v_result WHERE id=d.id;
 RETURN v_result;
END; $$;

CREATE FUNCTION public.bind_reader_document(p_document uuid,p_book text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE cid uuid; sid uuid; manual_time timestamptz;
BEGIN
 SELECT connection_id INTO cid FROM reader_documents WHERE id=p_document AND user_id=auth.uid();
 PERFORM 1 FROM reader_connections WHERE id=cid AND user_id=auth.uid() AND revoked_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Device not found'; END IF;
 SELECT reading_session_id,progress_updated_at INTO sid,manual_time FROM library_items WHERE user_id=auth.uid() AND book_id=p_book;
 IF NOT FOUND THEN RAISE EXCEPTION 'Book not in your library'; END IF;
 -- Remapping to a different edition is not implicit; avoid orphaning existing fragments.
 IF EXISTS(SELECT 1 FROM reader_documents WHERE id=p_document AND book_id IS NOT NULL AND book_id<>p_book) THEN RAISE EXCEPTION 'Questo documento è già associato a un altro libro.'; END IF;
 UPDATE reader_documents SET book_id=p_book,session_id=sid,confirmed_manual_at=manual_time WHERE id=p_document AND user_id=auth.uid();
 RETURN apply_reader_document(p_document);
END; $$;

CREATE FUNCTION public.ingest_reader_batch(p_connection uuid,p_credential text,p_documents jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c public.reader_connections; entry jsonb; annotation jsonb; did uuid; previous jsonb; payload jsonb; results jsonb='[]'; outcome text; observed timestamptz;
BEGIN
 c=check_reader_credential(p_connection,p_credential);
 IF jsonb_typeof(p_documents) IS DISTINCT FROM 'array' OR jsonb_array_length(p_documents)>32 OR octet_length(p_documents::text)>1500000 THEN RAISE EXCEPTION 'Invalid batch'; END IF;
 FOR entry IN SELECT value FROM jsonb_array_elements(p_documents) LOOP
   IF jsonb_typeof(entry) IS DISTINCT FROM 'object' OR coalesce(entry->>'external_id','')='' OR char_length(entry->>'external_id')>500 OR jsonb_typeof(coalesce(entry->'authors','[]'))<>'array' OR jsonb_array_length(coalesce(entry->'authors','[]'))>20 THEN RAISE EXCEPTION 'Invalid document'; END IF;
   payload=NULL;
   IF entry->>'percentage' IS NOT NULL THEN
     IF c.kind='kindle' OR (entry->>'percentage')::numeric NOT BETWEEN 0 AND 100 OR coalesce(entry->>'event_id','')='' OR char_length(entry->>'event_id')>300 OR char_length(coalesce(entry->>'locator',''))>1000 THEN RAISE EXCEPTION 'Invalid progress'; END IF;
     observed=(entry->>'observed_at')::timestamptz;
     IF observed IS NULL OR observed>now()+interval '5 minutes' OR observed<'2000-01-01'::timestamptz OR (coalesce((entry->>'finished')::boolean,false) AND (entry->>'percentage')::numeric<>100) THEN RAISE EXCEPTION 'Invalid progress timestamp or completion'; END IF;
     payload=jsonb_build_object('percentage',(entry->>'percentage')::numeric,'observed_at',entry->>'observed_at','event_id',entry->>'event_id','locator',left(coalesce(entry->>'locator',''),1000),'finished',coalesce((entry->>'finished')::boolean,false),'device',left(coalesce(entry->>'device',''),100),'device_id',left(coalesce(entry->>'device_id',''),100));
     payload=jsonb_set(payload,'{observed_at}',to_jsonb(least(observed,now())));
   END IF;
   IF (SELECT count(*) FROM reader_documents WHERE connection_id=c.id)>=5000 AND NOT EXISTS(SELECT 1 FROM reader_documents WHERE connection_id=c.id AND external_id=entry->>'external_id') THEN RAISE EXCEPTION 'Device document limit'; END IF;
   INSERT INTO reader_documents(connection_id,user_id,external_id,title,authors)
   VALUES(c.id,c.user_id,entry->>'external_id',coalesce(entry->>'title',''),ARRAY(SELECT jsonb_array_elements_text(coalesce(entry->'authors','[]'))))
   ON CONFLICT(connection_id,external_id) DO UPDATE SET title=CASE WHEN excluded.title<>'' THEN excluded.title ELSE reader_documents.title END,authors=CASE WHEN cardinality(excluded.authors)>0 THEN excluded.authors ELSE reader_documents.authors END,last_received_at=now()
   RETURNING id,progress_payload INTO did,previous;
   IF payload IS NOT NULL AND (previous IS NULL OR (payload->>'observed_at')::timestamptz>(previous->>'observed_at')::timestamptz) THEN
     UPDATE reader_documents SET progress_payload=payload WHERE id=did;
   END IF;
   IF jsonb_typeof(coalesce(entry->'fragments','[]'))<>'array' OR jsonb_array_length(coalesce(entry->'fragments','[]'))>20 THEN RAISE EXCEPTION 'Invalid annotations'; END IF;
   FOR annotation IN SELECT value FROM jsonb_array_elements(coalesce(entry->'fragments','[]')) LOOP
     INSERT INTO reader_annotations(document_id,user_id,external_id,quote,note,position,kind)
     VALUES(did,c.user_id,annotation->>'id',annotation->>'quote',coalesce(annotation->>'note',''),coalesce(annotation->>'position',''),coalesce(annotation->>'kind','quote'))
     ON CONFLICT(document_id,external_id) DO NOTHING;
   END LOOP;
   outcome=apply_reader_document(did);
   results=results||jsonb_build_array(jsonb_build_object('external_id',entry->>'external_id','result',outcome));
 END LOOP;
 UPDATE reader_connections SET last_received_at=now() WHERE id=c.id;
 RETURN jsonb_build_object('results',results);
END; $$;

CREATE FUNCTION public.reader_kosync(p_connection uuid,p_credential text,p_document text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c public.reader_connections; payload jsonb;
BEGIN
 c=check_reader_credential(p_connection,p_credential);
 IF c.kind<>'koreader' THEN RAISE EXCEPTION 'Invalid connection type'; END IF;
 IF p_document IS NULL THEN RETURN jsonb_build_object('authorized',true); END IF;
 SELECT progress_payload INTO payload FROM reader_documents WHERE connection_id=c.id AND external_id=p_document;
 IF payload IS NULL THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('document',p_document,'progress',payload->>'locator','percentage',(payload->>'percentage')::numeric/100,'device',payload->>'device','device_id',payload->>'device_id','timestamp',extract(epoch FROM (payload->>'observed_at')::timestamptz));
END; $$;

REVOKE ALL ON FUNCTION public.check_reader_credential(uuid,text),public.apply_reader_document(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.create_reader_connection(text,text,text),public.revoke_reader_connection(uuid),public.bind_reader_document(uuid,text),public.ingest_reader_batch(uuid,text,jsonb),public.reader_kosync(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_reader_connection(text,text,text),public.revoke_reader_connection(uuid),public.bind_reader_document(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_reader_batch(uuid,text,jsonb),public.reader_kosync(uuid,text,text) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
