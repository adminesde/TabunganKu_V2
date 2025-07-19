CREATE POLICY "Parents can view their children's transactions." ON public.transactions
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.students
    WHERE (
      (students.id = transactions.student_id) AND (students.parent_id = auth.uid())
    )
  )
);