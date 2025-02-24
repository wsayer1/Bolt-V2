/*
  # Direct Messages System

  1. New Tables
    - `direct_messages`
      - `id` (uuid, primary key)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `sender_id` (uuid, references users)
      - `receiver_id` (uuid, references users)
      - `content` (text)
      - `is_read` (boolean)

  2. Security
    - Enable RLS
    - Add policies for reading and sending messages
    - Add function for updating read status

  3. Performance
    - Add indexes for common queries
*/

-- Drop everything first to ensure clean state
DROP TABLE IF EXISTS direct_messages CASCADE;
DROP FUNCTION IF EXISTS update_direct_messages_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_message_read_status(uuid) CASCADE;

-- Create direct_messages table
CREATE TABLE direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sender_id uuid REFERENCES users(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  CONSTRAINT content_not_empty CHECK (char_length(trim(content)) > 0)
);

-- Enable RLS
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_direct_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER set_direct_messages_updated_at
  BEFORE UPDATE ON direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_direct_messages_updated_at();

-- Create policies
CREATE POLICY "Users can read their own messages"
  ON direct_messages
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id
  );

CREATE POLICY "Users can send messages"
  ON direct_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
  );

CREATE POLICY "Users can mark messages as read"
  ON direct_messages
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = receiver_id
  )
  WITH CHECK (
    auth.uid() = receiver_id AND
    is_read = true AND
    EXISTS (
      SELECT 1
      FROM direct_messages dm
      WHERE dm.id = direct_messages.id
        AND dm.receiver_id = auth.uid()
        AND dm.is_read = false
    )
  );

-- Create function to safely update message read status
CREATE OR REPLACE FUNCTION update_message_read_status(message_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE direct_messages
  SET is_read = true
  WHERE id = message_id
    AND receiver_id = auth.uid()
    AND is_read = false;
  
  RETURN FOUND;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS direct_messages_sender_id_idx ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS direct_messages_receiver_id_idx ON direct_messages(receiver_id);
CREATE INDEX IF NOT EXISTS direct_messages_created_at_idx ON direct_messages(created_at DESC);

-- Create function to get or create a conversation
CREATE OR REPLACE FUNCTION get_or_create_conversation(other_user_id uuid)
RETURNS TABLE (
  conversation_id uuid,
  other_user_name text,
  other_user_photo text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Get other user's details
  RETURN QUERY
  WITH user_details AS (
    SELECT 
      full_name,
      CASE 
        WHEN photos IS NOT NULL AND array_length(photos, 1) > 0 
        THEN photos[1]
        ELSE NULL
      END as photo
    FROM users
    WHERE id = other_user_id
  )
  SELECT 
    gen_random_uuid() as conversation_id,
    ud.full_name as other_user_name,
    ud.photo as other_user_photo
  FROM user_details ud;
END;
$$;