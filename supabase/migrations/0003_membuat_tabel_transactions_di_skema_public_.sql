CREATE TYPE public.transaction_type AS ENUM ('deposit', 'withdrawal');

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  type transaction_type NOT NULL,
  description TEXT,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

alter table public.transactions enable row level security;

create policy "Teachers can view their students' transactions." on transactions for select using ( auth.uid() = teacher_id );
create policy "Teachers can insert their students' transactions." on transactions for insert with check ( auth.uid() = teacher_id );
create policy "Teachers can update their students' transactions." on transactions for update using ( auth.uid() = teacher_id );
create policy "Teachers can delete their students' transactions." on transactions for delete using ( auth.uid() = teacher_id );