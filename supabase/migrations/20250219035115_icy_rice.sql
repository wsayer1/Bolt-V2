-- Drop existing function first
DROP FUNCTION IF EXISTS start_conversation(uuid);

-- Drop direct messages system
DROP TABLE IF EXISTS direct_messages CASCADE;
DROP FUNCTION IF EXISTS update_direct_messages_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_message_read_status(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_or_create_conversation(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_conversation_details(uuid) CASCADE;

-- Add last_message_preview to conversations table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' 
    AND column_name = 'last_message_preview'
  ) THEN
    ALTER TABLE conversations
    ADD COLUMN last_message_preview jsonb;
  END IF;
END $$;

-- Create function to get or start conversation
CREATE OR REPLACE FUNCTION start_conversation(other_user_id uuid)
RETURNS TABLE (
  conversation_id uuid,
  other_user_details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid;
  v_user_details jsonb;
BEGIN
  -- Get other user's details
  SELECT jsonb_build_object(
    'id', id,
    'full_name', full_name,
    'photo', CASE 
      WHEN photos IS NOT NULL AND array_length(photos, 1) > 0 
      THEN photos[1]
      ELSE NULL
    END
  )
  INTO v_user_details
  FROM users
  WHERE id = other_user_id;

  -- Check if conversation already exists
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  JOIN conversation_participants cp1 ON cp1.conversation_id = c.id
  JOIN conversation_participants cp2 ON cp2.conversation_id = c.id
  WHERE cp1.user_id = auth.uid()
  AND cp2.user_id = other_user_id
  LIMIT 1;

  -- If no conversation exists, create one
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations DEFAULT VALUES
    RETURNING id INTO v_conversation_id;

    -- Add participants
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES
      (v_conversation_id, auth.uid()),
      (v_conversation_id, other_user_id);
  END IF;

  RETURN QUERY
  SELECT 
    v_conversation_id,
    v_user_details;
END;
$$;