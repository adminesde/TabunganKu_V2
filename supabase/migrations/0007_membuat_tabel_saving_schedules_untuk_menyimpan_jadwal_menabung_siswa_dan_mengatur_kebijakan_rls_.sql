CREATE TABLE public.saving_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount_expected NUMERIC NOT NULL,
  frequency TEXT NOT NULL, -- e.g., 'daily', 'weekly', 'monthly'
  day_of_week TEXT, -- e.g., 'Monday', 'Tuesday' (if frequency is weekly), NULL otherwise
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) -- The admin/teacher who set the schedule
);

-- Enable Row Level Security
ALTER TABLE public.saving_schedules ENABLE ROW LEVEL SECURITY;

-- Policy for Admins: Can view, insert, update, delete all schedules
CREATE POLICY "Admins can manage all saving schedules." ON public.saving_schedules
FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Policy for Teachers: Can view, insert, update, delete schedules for their own students
CREATE POLICY "Teachers can manage their students' saving schedules." ON public.saving_schedules
FOR ALL USING (EXISTS (SELECT 1 FROM public.students WHERE students.id = saving_schedules.student_id AND students.teacher_id = auth.uid()));

-- Policy for Parents: Can view schedules for their own children
CREATE POLICY "Parents can view their children's saving schedules." ON public.saving_schedules
FOR SELECT USING (EXISTS (SELECT 1 FROM public.students WHERE students.id = saving_schedules.student_id AND students.parent_id = auth.uid()));