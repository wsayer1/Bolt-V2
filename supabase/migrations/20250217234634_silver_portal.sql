/*
  # Fix email handling in user trigger
  
  This migration updates the trigger function to:
  1. Correctly access the email field from auth.users
  2. Add better error handling
  3. Ensure proper column access
*/

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop existing function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create updated trigger function with proper email handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert new user with proper email access
  INSERT INTO public.users (
    id,
    email,
    created_at
  ) VALUES (
    NEW.id,
    NEW.email,  -- Direct access to email field
    COALESCE(NEW.created_at, now())
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- If there's a unique violation, just return the NEW record
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log other errors but don't block the auth signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();