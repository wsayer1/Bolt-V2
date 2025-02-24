/*
  # Fix Event Attendees Relationship

  1. Changes
    - Drop existing foreign key constraints
    - Update user_id reference to point to users table
    - Re-create policies with proper security

  2. Security
    - Maintain RLS for event_attendees table
    - Ensure proper access control for RSVPs
*/

-- First drop existing foreign key if it exists
ALTER TABLE event_attendees 
DROP CONSTRAINT IF EXISTS event_attendees_user_id_fkey;

-- Add the foreign key constraint with proper references to users table
ALTER TABLE event_attendees
ADD CONSTRAINT event_attendees_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;

-- Refresh RLS policies
DO $$ 
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Anyone can view event attendees" ON event_attendees;
  DROP POLICY IF EXISTS "Authenticated users can RSVP to events" ON event_attendees;
  DROP POLICY IF EXISTS "Users can cancel their own RSVPs" ON event_attendees;

  -- Re-create policies
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
END $$;