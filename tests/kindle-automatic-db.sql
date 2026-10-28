BEGIN;
DO $$
DECLARE owner uuid; secret text; payload text; claim jsonb; result jsonb; rejected boolean=false;
BEGIN
 SELECT user_id INTO owner FROM public.kindle_cloud_connections WHERE ciphertext IS NOT NULL LIMIT 1;
 IF owner IS NULL THEN RAISE EXCEPTION 'Connected account required for rollback-only verification'; END IF;
 SELECT decrypted_secret INTO secret FROM vault.decrypted_secrets WHERE name='silvae_kindle_job_key';
 IF secret IS NULL THEN secret=repeat('a',64); PERFORM vault.create_secret(secret,'silvae_kindle_job_key'); END IF;
 UPDATE public.kindle_cloud_connections SET automatic_enabled=true,automatic_since=now(),lease=NULL,lease_until=NULL WHERE user_id=owner;
 payload=jsonb_build_object('owner',owner,'time',floor(extract(epoch FROM clock_timestamp())*1000),'action','claim')::text;
 BEGIN PERFORM public.kindle_cloud_job(payload,repeat('0',64)); EXCEPTION WHEN OTHERS THEN IF SQLERRM='Unauthorized' THEN rejected=true; ELSE RAISE; END IF; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Unsigned job accepted'; END IF;
 claim=public.kindle_cloud_job(payload,encode(extensions.hmac(convert_to(payload,'UTF8'),decode(secret,'hex'),'sha256'),'hex'));
 IF claim->>'lease' IS NULL OR claim->>'ciphertext' IS NULL THEN RAISE EXCEPTION 'Valid job not claimed'; END IF;
 payload=jsonb_build_object('owner',owner,'time',floor(extract(epoch FROM clock_timestamp())*1000),'action','finish','ciphertext',claim->>'ciphertext','updates','[]'::jsonb)::text;
 result=public.kindle_cloud_job(payload,encode(extensions.hmac(convert_to(payload,'UTF8'),decode(secret,'hex'),'sha256'),'hex'));
 IF result IS NOT NULL THEN RAISE EXCEPTION 'Missing lease accepted'; END IF;
 PERFORM set_config('request.jwt.claim.sub',owner::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','authenticated')::text,true);
 PERFORM public.kindle_cloud_automatic(false);
 payload=(payload::jsonb||jsonb_build_object('lease',claim->>'lease'))::text;
 result=public.kindle_cloud_job(payload,encode(extensions.hmac(convert_to(payload,'UTF8'),decode(secret,'hex'),'sha256'),'hex'));
 IF result IS NOT NULL THEN RAISE EXCEPTION 'Cancelled job applied'; END IF;
 IF has_table_privilege('anon','public.kindle_cloud_connections','SELECT') THEN RAISE EXCEPTION 'Ciphertext publicly readable'; END IF;
 IF has_function_privilege('anon','silvae_private.dispatch_kindle_jobs()','EXECUTE') THEN RAISE EXCEPTION 'Dispatcher public'; END IF;
END $$;
DO $$
DECLARE owner uuid; secret text; payload text; claim jsonb; result jsonb;
 item public.library_items; observed timestamptz=clock_timestamp()+interval '10 seconds';
BEGIN
 SELECT user_id INTO owner FROM public.kindle_cloud_connections WHERE ciphertext IS NOT NULL LIMIT 1;
 SELECT decrypted_secret INTO secret FROM vault.decrypted_secrets WHERE name='silvae_kindle_job_key';
 UPDATE public.kindle_cloud_connections SET automatic_enabled=true,automatic_since=now(),lease=NULL,lease_until=NULL WHERE user_id=owner;
 SELECT * INTO item FROM public.library_items WHERE user_id=owner LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Library item required for rollback-only verification'; END IF;
 UPDATE public.library_items SET status='to_read',progress_percent=0,progress_updated_at=NULL,started_at=NULL,finished_at=NULL WHERE id=item.id;
 SELECT * INTO item FROM public.library_items WHERE id=item.id;
 payload=jsonb_build_object('owner',owner,'time',floor(extract(epoch FROM clock_timestamp())*1000),'action','claim')::text;
 claim=public.kindle_cloud_job(payload,encode(extensions.hmac(convert_to(payload,'UTF8'),decode(secret,'hex'),'sha256'),'hex'));
 payload=jsonb_build_object('owner',owner,'time',floor(extract(epoch FROM clock_timestamp())*1000),'action','finish','lease',claim->>'lease','ciphertext',claim->>'ciphertext','updates',jsonb_build_array(jsonb_build_object('id',item.id,'session',item.reading_session_id,'version',item.updated_at,'position',25,'observed',observed,'percentage',25)))::text;
 result=public.kindle_cloud_job(payload,encode(extensions.hmac(convert_to(payload,'UTF8'),decode(secret,'hex'),'sha256'),'hex'));
 SELECT * INTO item FROM public.library_items WHERE id=item.id;
 IF result->>'changed'<>'1' OR item.status<>'reading' OR item.progress_percent<>25 OR item.started_at IS NULL THEN RAISE EXCEPTION 'New reading progress not applied'; END IF;
 -- An in-flight event must lose to a newer manual edit.
 payload=jsonb_build_object('owner',owner,'time',floor(extract(epoch FROM clock_timestamp())*1000),'action','claim')::text;
 claim=public.kindle_cloud_job(payload,encode(extensions.hmac(convert_to(payload,'UTF8'),decode(secret,'hex'),'sha256'),'hex'));
 payload=jsonb_build_object('owner',owner,'time',floor(extract(epoch FROM clock_timestamp())*1000),'action','finish','lease',claim->>'lease','ciphertext',claim->>'ciphertext','updates',jsonb_build_array(jsonb_build_object('id',item.id,'session',item.reading_session_id,'version',item.updated_at,'position',50,'observed',observed+interval '1 second','percentage',50)))::text;
 UPDATE public.library_items SET progress_percent=75,progress_source='manual',progress_updated_at=observed+interval '2 seconds' WHERE id=item.id;
 result=public.kindle_cloud_job(payload,encode(extensions.hmac(convert_to(payload,'UTF8'),decode(secret,'hex'),'sha256'),'hex'));
 SELECT * INTO item FROM public.library_items WHERE id=item.id;
 IF result->>'changed'<>'0' OR item.progress_percent<>75 THEN RAISE EXCEPTION 'Manual progress overwritten'; END IF;
END $$;
ROLLBACK;
SELECT 'Kindle automatic auth, lease, cancellation, reading updates and manual edit checks passed' AS result;
