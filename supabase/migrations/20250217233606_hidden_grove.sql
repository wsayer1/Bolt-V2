/*
  # Update handle_new_user trigger function

  1. Changes
    - Add better error handling
    - Add EXCEPTION block to catch and handle errors
    - Add DECLARE block for variable declarations
    - Add logging for debugging

  2. Security
    - Maintain SECURITY DEFINER for proper permissions
*/

-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop existing function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create updated trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_count int;
BEGIN
  -- Check if user already exists
  SELECT COUNT(*) INTO v_count
  FROM public.users
  WHERE id = NEW.id;

  IF v_count = 0 THEN
    -- Insert new user only if they don't exist
    INSERT INTO public.users (id, email, created_at)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.created_at
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block auth signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();