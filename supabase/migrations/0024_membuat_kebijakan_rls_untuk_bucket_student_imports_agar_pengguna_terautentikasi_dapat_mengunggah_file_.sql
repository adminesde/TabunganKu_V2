CREATE POLICY "Allow authenticated users to upload to student-imports"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'student-imports');

CREATE POLICY "Allow authenticated users to view their own uploads in student-imports"
ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'student-imports' AND auth.uid() = owner);

CREATE POLICY "Allow authenticated users to delete their own uploads in student-imports"
ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'student-imports' AND auth.uid() = owner);