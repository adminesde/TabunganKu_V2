CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  nisn TEXT UNIQUE NOT NULL,
  class TEXT NOT NULL,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

alter table public.students enable row level security;

create policy "Teachers can view their own students." on students for select using ( auth.uid() = teacher_id );
create policy "Teachers can insert their own students." on students for insert with check ( auth.uid() = teacher_id );
create policy "Teachers can update their own students." on students for update using ( auth.uid() = teacher_id );
create policy "Teachers can delete their own students." on students for delete using ( auth.uid() = teacher_id );