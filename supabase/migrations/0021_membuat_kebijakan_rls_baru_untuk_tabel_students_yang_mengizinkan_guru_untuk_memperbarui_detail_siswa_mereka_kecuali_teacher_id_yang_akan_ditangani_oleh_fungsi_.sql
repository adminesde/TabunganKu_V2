CREATE POLICY "Allow teacher to update their students details (excluding teacher_id)"
ON public.students
FOR UPDATE
TO authenticated
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);