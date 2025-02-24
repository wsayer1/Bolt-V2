/*
  # Add event attendance functionality

  1. Changes
    - Add host_id to events table
    - Create event_attendees table for tracking event attendance
    - Add RLS policies for events and event_attendees tables

  2. New Tables
    - event_attendees
      - id (uuid, primary key)
      - event_id (uuid, foreign key to events)
      - user_id (uuid, foreign key to users)
      - created_at (timestamptz)

  3. Security
    - Enable RLS on event_attendees table
    - Add policies for event attendance management
*/

-- Add host_id to events table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'host_id'
  ) THEN
    ALTER TABLE events ADD COLUMN host_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Create event_attendees table
CREATE TABLE IF NOT EXISTS event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

-- Policies for event_attendees
CREATE POLICY "Anyone can view event attendees"
  ON event_attendees
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can RSVP to events"
  ON event_attendees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    (
      SELECT count(*) 
      FROM event_attendees 
      WHERE event_id = event_attendees.event_id
    ) < COALESCE(
      (SELECT max_attendees FROM events WHERE id = event_attendees.event_id),
      2147483647
    )
  );

CREATE POLICY "Users can cancel their own RSVPs"
  ON event_attendees
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update events table policies
DROP POLICY IF EXISTS "Anyone can read events" ON events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON events;
DROP POLICY IF EXISTS "Hosts can update their own events" ON events;

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

-- Add foreign key relationship for host_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'events' 
    AND constraint_name = 'events_host_id_fkey'
  ) THEN
    ALTER TABLE events
    ADD CONSTRAINT events_host_id_fkey
    FOREIGN KEY (host_id)
    REFERENCES auth.users(id);
  END IF;
END $$;

-- Update existing events to have a host_id (using the first user in the system)
UPDATE events 
SET host_id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1)
WHERE host_id IS NULL;

-- Make host_id NOT NULL after setting default values
ALTER TABLE events ALTER COLUMN host_id SET NOT NULL;