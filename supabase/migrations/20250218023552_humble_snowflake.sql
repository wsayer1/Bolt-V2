/*
  # Fix events table relationships

  1. Changes
    - Drop existing policies before altering column
    - Update host_id column type to uuid
    - Re-create foreign key constraint
    - Re-create policies with proper checks
*/

-- First drop existing policies
DROP POLICY IF EXISTS "Anyone can read events" ON events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON events;
DROP POLICY IF EXISTS "Hosts can update their own events" ON events;

-- Now we can safely alter the column type
ALTER TABLE events 
ALTER COLUMN host_id TYPE uuid USING host_id::uuid;

-- Drop existing foreign key if it exists
ALTER TABLE events 
DROP CONSTRAINT IF EXISTS events_host_id_fkey;

-- Add the foreign key constraint with proper references
ALTER TABLE events
ADD CONSTRAINT events_host_id_fkey
FOREIGN KEY (host_id)
REFERENCES auth.users(id)
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