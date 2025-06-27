-- Create a function to safely check if a user exists by email
-- This avoids the authentication-based check that can give false positives
CREATE OR REPLACE FUNCTION public.check_user_exists_by_email(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Uses the privileges of the function creator
SET search_path = public
AS $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  -- Check auth.users table to see if a user with that email exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = email_to_check
  ) INTO user_exists;
  
  RETURN user_exists;
END;
$$;
