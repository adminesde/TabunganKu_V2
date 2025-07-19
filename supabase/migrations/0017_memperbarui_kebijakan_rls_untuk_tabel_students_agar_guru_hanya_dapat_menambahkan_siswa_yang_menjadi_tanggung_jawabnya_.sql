ALTER POLICY "Teachers can insert their own students." ON public.students
WITH CHECK (auth.uid() = teacher_id);