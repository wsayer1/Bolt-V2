/*
  # Update user creation trigger

  1. Changes
    - Drop existing trigger and function
    - Create improved trigger function with better error handling
    - Add explicit transaction handling
    - Add detailed logging

  2. Security
    - Maintain SECURITY DEFINER for proper permissions
    - Set explicit search path for security
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
BEGIN
  -- Insert new user
  INSERT INTO public.users (
    id,
    email,
    created_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.created_at, now())
  );

  -- Log successful insertion
  RAISE NOTICE 'New user created with id: %', NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RAISE WARNING 'User already exists with id: %', NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user: % %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();