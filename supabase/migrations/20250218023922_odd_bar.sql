/*
  # Fix Events Host Relationship

  1. Changes
    - Drop existing policies
    - Update host_id column type and constraints
    - Re-create policies with proper security

  2. Security
    - Maintain RLS for events table
    - Ensure proper access control
*/

-- First drop all policies that depend on host_id
DROP POLICY IF EXISTS "Anyone can read events" ON events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON events;
DROP POLICY IF EXISTS "Hosts can update their own events" ON events;

-- Drop existing foreign key if it exists
ALTER TABLE events 
DROP CONSTRAINT IF EXISTS events_host_id_fkey;

-- Now we can safely alter the column
ALTER TABLE events 
ALTER COLUMN host_id TYPE uuid USING host_id::uuid;

-- Add the foreign key constraint with proper references
ALTER TABLE events
ADD CONSTRAINT events_host_id_fkey
FOREIGN KEY (host_id)
REFERENCES users(id)
ON DELETE SET NULL;

-- Re-create the policies
CREATE POLICY "Anyone can read events"
  ON events
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their own events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);