CREATE OR REPLACE FUNCTION public.transfer_student_teacher(
    student_id_param UUID,
    new_teacher_id_param UUID
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_user_id UUID := auth.uid();
    old_teacher_id_val UUID;
    user_role TEXT;
BEGIN
    -- Get the role of the current authenticated user
    SELECT role INTO user_role FROM public.profiles WHERE id = current_user_id;

    -- Check if the current user is an admin or the current teacher of the student
    IF user_role = 'admin' THEN
        -- Admins can transfer any student
        UPDATE public.students
        SET teacher_id = new_teacher_id_param
        WHERE id = student_id_param;
    ELSIF user_role = 'teacher' THEN
        -- Get the current teacher_id of the student
        SELECT teacher_id INTO old_teacher_id_val FROM public.students WHERE id = student_id_param;

        -- Check if the current user is the old teacher of the student
        IF old_teacher_id_val = current_user_id THEN
            UPDATE public.students
            SET teacher_id = new_teacher_id_param
            WHERE id = student_id_param;
        ELSE
            RAISE EXCEPTION 'Akses ditolak: Anda bukan guru yang mengajar siswa ini.';
        END IF;
    ELSE
        RAISE EXCEPTION 'Akses ditolak: Anda tidak memiliki izin untuk mentransfer siswa.';
    END IF;
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION public.transfer_student_teacher(UUID, UUID) TO authenticated;