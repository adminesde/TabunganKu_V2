CREATE POLICY "Allow authenticated users to upload their own student import files"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'student-imports' AND auth.uid()::text = (storage.foldername(name))[2]);

    CREATE POLICY "Allow authenticated users to view their own student import files"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'student-imports' AND auth.uid()::text = (storage.foldername(name))[2]);

    CREATE POLICY "Allow admins to view all student import files"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'student-imports' AND EXISTS ( SELECT 1 FROM public.profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))));