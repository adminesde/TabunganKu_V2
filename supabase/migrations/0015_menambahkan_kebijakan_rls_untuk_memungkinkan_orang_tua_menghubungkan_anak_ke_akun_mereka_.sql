CREATE POLICY "Parents can link their children by NISN." ON public.students
FOR UPDATE USING (
  (auth.uid() = parent_id) OR (parent_id IS NULL)
) WITH CHECK (
  (auth.uid() = parent_id)
);