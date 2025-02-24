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
    - Add policy for marking messages as read

  3. Performance
    - Add indexes for sender_id, receiver_id, and created_at
    - Add trigger for updating updated_at timestamp
*/

-- Create direct_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS direct_messages (
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

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_direct_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_direct_messages_updated_at ON direct_messages;

-- Create new trigger
CREATE TRIGGER set_direct_messages_updated_at
  BEFORE UPDATE ON direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_direct_messages_updated_at();

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own messages" ON direct_messages;
DROP POLICY IF EXISTS "Users can send messages" ON direct_messages;
DROP POLICY IF EXISTS "Users can mark messages as read" ON direct_messages;

-- Create new policies
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
    EXISTS (
      SELECT 1
      FROM direct_messages dm
      WHERE dm.id = id
        AND dm.receiver_id = auth.uid()
        AND dm.is_read = false
        AND dm.content = content
        AND dm.sender_id = sender_id
        AND dm.receiver_id = receiver_id
    )
  );

-- Create or replace function to safely update message read status
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

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS direct_messages_sender_id_idx;
DROP INDEX IF EXISTS direct_messages_receiver_id_idx;
DROP INDEX IF EXISTS direct_messages_created_at_idx;

-- Create new indexes
CREATE INDEX direct_messages_sender_id_idx ON direct_messages(sender_id);
CREATE INDEX direct_messages_receiver_id_idx ON direct_messages(receiver_id);
CREATE INDEX direct_messages_created_at_idx ON direct_messages(created_at DESC);