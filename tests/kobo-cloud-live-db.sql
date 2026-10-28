-- Rollback-only verification: no Kobo credentials and no outbound requests.
BEGIN;
DO $$
DECLARE owner uuid; secret text; payload text; claimed jsonb; result jsonb;
 item public.library_items; observed timestamptz=now()-interval '1 day'; rejected boolean=false;
BEGIN
 SELECT user_id INTO owner FROM public.kindle_cloud_connections WHERE ciphertext IS NOT NULL LIMIT 1;
 IF owner IS NULL THEN RAISE EXCEPTION 'An existing test owner is required'; END IF;
 IF has_table_privilege('authenticated','public.kobo_cloud_connections','SELECT') OR has_function_privilege('anon','public.kobo_cloud_read()','EXECUTE') OR has_function_privilege('authenticated','silvae_private.claim_kobo(uuid,boolean)','EXECUTE') THEN RAISE EXCEPTION 'Unexpected privilege'; END IF;
 SELECT decrypted_secret INTO secret FROM vault.decrypted_secrets WHERE name='silvae_kindle_job_key';
 IF secret IS NULL THEN RAISE EXCEPTION 'Existing scheduler key is required'; END IF;
 INSERT INTO public.kobo_cloud_connections(user_id,ciphertext,automatic_enabled) VALUES(owner,'rollback-fixture',true)
 ON CONFLICT(user_id) DO UPDATE SET ciphertext='rollback-fixture',automatic_enabled=true,lease=NULL,lease_until=NULL;
 payload=jsonb_build_object('provider','kobo','owner',owner,'action','claim','time',floor(extract(epoch FROM clock_timestamp())*1000))::text;
 BEGIN PERFORM public.kobo_cloud_job(payload,repeat('0',64)); EXCEPTION WHEN OTHERS THEN IF SQLERRM='Unauthorized' THEN rejected=true; ELSE RAISE; END IF; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Unsigned job accepted'; END IF;
 claimed=public.kobo_cloud_job(payload,encode(extensions.hmac(convert_to(payload,'UTF8'),decode(secret,'hex'),'sha256'),'hex'));
 IF claimed->>'lease' IS NULL THEN RAISE EXCEPTION 'Signed claim rejected'; END IF;
 IF public.kobo_cloud_job(payload,encode(extensions.hmac(convert_to(payload,'UTF8'),decode(secret,'hex'),'sha256'),'hex')) IS NOT NULL THEN RAISE EXCEPTION 'Concurrent claim accepted'; END IF;
 PERFORM set_config('request.jwt.claim.sub',owner::text,true);
 PERFORM public.kobo_cloud_disconnect();
 payload=jsonb_build_object('provider','kobo','owner',owner,'action','finish','time',floor(extract(epoch FROM clock_timestamp())*1000),'lease',claimed->>'lease','ciphertext','rollback-fixture','updates','[]'::jsonb,'error',false)::text;
 IF public.kobo_cloud_job(payload,encode(extensions.hmac(convert_to(payload,'UTF8'),decode(secret,'hex'),'sha256'),'hex')) IS NOT NULL THEN RAISE EXCEPTION 'Disconnected job resumed'; END IF;
 claimed=public.kobo_cloud_claim(false);
 SELECT * INTO item FROM public.library_items WHERE user_id=owner ORDER BY updated_at DESC LIMIT 1;
 IF item.id IS NULL THEN RAISE EXCEPTION 'A library fixture is required'; END IF;
 UPDATE public.library_items SET status='to_read',started_at=NULL,finished_at=NULL,progress_percent=0,progress_updated_at='2020-01-01',updated_at='2020-01-01' WHERE id=item.id;
 SELECT * INTO item FROM public.library_items WHERE id=item.id;
 result=public.kobo_cloud_finish((claimed->>'lease')::uuid,'rollback-fixture',jsonb_build_array(jsonb_build_object('id',item.id,'session',item.reading_session_id,'version',item.updated_at,'observed',observed,'percentage',25,'status','reading')),false);
 SELECT * INTO item FROM public.library_items WHERE id=item.id;
 IF result->>'changed'<>'1' OR item.status<>'reading' OR item.progress_percent<>25 OR item.progress_source<>'kobo' THEN RAISE EXCEPTION 'Reading update failed'; END IF;
 claimed=public.kobo_cloud_claim(false);
 UPDATE public.library_items SET progress_percent=75,progress_source='manual',progress_updated_at=observed+interval '2 hours',updated_at=now() WHERE id=item.id;
 result=public.kobo_cloud_finish((claimed->>'lease')::uuid,'rollback-fixture',jsonb_build_array(jsonb_build_object('id',item.id,'session',item.reading_session_id,'version',item.updated_at,'observed',observed+interval '1 hour','percentage',50,'status','reading')),false);
 IF result->>'changed'<>'0' THEN RAISE EXCEPTION 'Manual edit overwritten'; END IF;
 claimed=public.kobo_cloud_claim(false);
 SELECT * INTO item FROM public.library_items WHERE id=item.id;
 result=public.kobo_cloud_finish((claimed->>'lease')::uuid,'rollback-fixture',jsonb_build_array(jsonb_build_object('id',item.id,'session',item.reading_session_id,'version',item.updated_at,'observed',observed+interval '3 hours','status','read')),false);
 SELECT * INTO item FROM public.library_items WHERE id=item.id;
 IF result->>'changed'<>'1' OR item.status<>'read' OR item.progress_percent<>75 THEN RAISE EXCEPTION 'Status-only completion lost or percentage overwritten'; END IF;
END $$;
ROLLBACK;
SELECT 'Kobo owner permissions, signed jobs, leases, disconnect, reading updates and manual conflicts passed' AS result;
