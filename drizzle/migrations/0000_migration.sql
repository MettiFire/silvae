DROP POLICY IF EXISTS "library_public_read" ON public.library_items;
CREATE POLICY "library_read_signed_in" ON public.library_items FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.library_items FROM anon;
DROP POLICY IF EXISTS "covers_read" ON storage.objects;
CREATE POLICY "covers_read_signed_in" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'covers');