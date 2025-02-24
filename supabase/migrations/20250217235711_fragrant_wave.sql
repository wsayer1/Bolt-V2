/*
  # Add INSERT policy for users table
  
  This migration adds the necessary RLS policy to allow the trigger function
  to insert new user records.
*/

-- Add INSERT policy for the trigger function
CREATE POLICY "Trigger can insert users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Also add a policy for the system to insert users
CREATE POLICY "System can insert users"
  ON users
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Ensure policies are enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;