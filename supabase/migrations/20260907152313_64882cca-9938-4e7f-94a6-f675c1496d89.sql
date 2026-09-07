CREATE POLICY "covers_read" ON storage.objects FOR SELECT USING (bucket_id = 'covers');
CREATE POLICY "covers_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "covers_update_own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "covers_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);