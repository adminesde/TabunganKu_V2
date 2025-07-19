ALTER TABLE public.transactions
ADD CONSTRAINT fk_teacher_id
FOREIGN KEY (teacher_id) REFERENCES public.profiles(id);