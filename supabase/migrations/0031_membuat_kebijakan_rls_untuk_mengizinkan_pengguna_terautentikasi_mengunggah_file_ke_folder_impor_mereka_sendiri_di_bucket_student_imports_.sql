DROP POLICY IF EXISTS "Allow authenticated users to upload to their own imports folder" ON storage.objects;

CREATE POLICY "Allow authenticated users to upload to their own imports folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'student-imports' AND
  auth.uid()::text = (storage.foldername(name))[2]
);