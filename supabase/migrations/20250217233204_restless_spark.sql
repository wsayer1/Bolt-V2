/*
  # Add user creation trigger

  1. Changes
    - Create a trigger to automatically create a user record when a new auth user signs up
    - Trigger will copy the user's ID and email from auth.users to the public.users table

  2. Security
    - Trigger runs with security definer permissions to ensure it can create records
    - Only triggered on new user creation in auth.users
*/

-- Create trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.created_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();