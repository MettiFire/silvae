-- Photos remain in a private bucket. Reads follow the fragment's existing RLS.
ALTER TABLE public.fragments ADD COLUMN image_path text;
ALTER TABLE public.fragments DROP CONSTRAINT fragments_quote_check;
ALTER TABLE public.fragments ADD CONSTRAINT fragments_quote_or_photo CHECK (
 char_length(quote) <= 20000 AND (char_length(btrim(quote)) > 0 OR image_path IS NOT NULL)
);
ALTER TABLE public.fragments ADD CONSTRAINT fragments_photo_owner CHECK (
 image_path IS NULL OR image_path ~ ('^' || user_id::text || '/[a-f0-9-]{36}\.webp$')
);
CREATE UNIQUE INDEX fragments_image_path ON public.fragments(image_path) WHERE image_path IS NOT NULL;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('fragment-photos','fragment-photos',false,2097152,ARRAY['image/webp']);

CREATE POLICY fragment_photos_insert ON storage.objects FOR INSERT TO authenticated
 WITH CHECK (bucket_id='fragment-photos' AND
 name ~ ('^' || (select auth.uid())::text || '/[a-f0-9-]{36}\.webp$'));
CREATE POLICY fragment_photos_read ON storage.objects FOR SELECT TO anon,authenticated
 USING (bucket_id='fragment-photos' AND (
 split_part(name,'/',1)=(select auth.uid())::text OR EXISTS (
  SELECT 1 FROM public.fragments f WHERE f.image_path=storage.objects.name AND f.deleted_at IS NULL
 )
 ));
CREATE POLICY fragment_photos_delete ON storage.objects FOR DELETE TO authenticated
 USING (bucket_id='fragment-photos' AND split_part(name,'/',1)=(select auth.uid())::text);

NOTIFY pgrst,'reload schema';
