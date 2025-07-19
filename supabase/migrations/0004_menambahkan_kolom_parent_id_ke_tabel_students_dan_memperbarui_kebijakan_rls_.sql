ALTER TABLE public.students
ADD COLUMN parent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add policy for parents to view their own children
CREATE POLICY "Parents can view their own children." ON public.students
FOR SELECT USING (auth.uid() = parent_id);

-- Update the handle_new_user function to include role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, role)
  VALUES (new.id, new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name', COALESCE(new.raw_user_meta_data ->> 'role', 'parent'));
  RETURN new;
END;
$$;