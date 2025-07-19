CREATE OR REPLACE FUNCTION public.create_initial_users(users_json JSONB)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  user_data JSONB;
  created_users JSONB[] := '{}';
  errors JSONB[] := '{}';
  new_user_id UUID;
  new_user_email TEXT;
  new_user_role TEXT;
  new_first_name TEXT;
  new_last_name TEXT;
BEGIN
  FOR user_data IN SELECT * FROM jsonb_array_elements(users_json)
  LOOP
    new_user_email := user_data ->> 'email';
    new_user_role := user_data ->> 'role';
    new_first_name := user_data ->> 'first_name';
    new_last_name := user_data ->> 'last_name';

    -- Create user in auth.users
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      new_user_email,
      crypt(user_data ->> 'password', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', '{"email"}'),
      jsonb_build_object('role', new_user_role, 'first_name', new_first_name, 'last_name', new_last_name)
    )
    RETURNING id, email INTO new_user_id, new_user_email;

    -- Insert into public.profiles (this will be handled by the handle_new_user trigger)
    -- No explicit insert needed here because the trigger 'on_auth_user_created' will handle it.

    created_users := array_append(created_users, jsonb_build_object('email', new_user_email, 'role', new_user_role, 'id', new_user_id));

  END LOOP;

  RETURN jsonb_build_object('createdUsers', created_users, 'errors', errors);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Grant usage to authenticated users (if needed for direct invocation, though typically admin would use service role)
GRANT EXECUTE ON FUNCTION public.create_initial_users(JSONB) TO authenticated;