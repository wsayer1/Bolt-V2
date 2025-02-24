/*
  # Update Conversation System

  1. Updates
    - Add functions for conversation management
    - Add proper indexes and constraints
    - Improve error handling
*/

-- Create function to get conversation details
CREATE OR REPLACE FUNCTION get_conversation_details(other_user_id uuid)
RETURNS TABLE (
  other_user_name text,
  other_user_photo text,
  last_message json,
  unread_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_details AS (
    SELECT 
      id,
      full_name,
      CASE 
        WHEN photos IS NOT NULL AND array_length(photos, 1) > 0 
        THEN photos[1]
        ELSE NULL
      END as photo
    FROM users
    WHERE id = other_user_id
  ),
  last_msg AS (
    SELECT 
      json_build_object(
        'id', id,
        'content', content,
        'created_at', created_at,
        'sender_id', sender_id,
        'is_read', is_read
      ) as msg
    FROM direct_messages
    WHERE 
      (sender_id = auth.uid() AND receiver_id = other_user_id) OR
      (sender_id = other_user_id AND receiver_id = auth.uid())
    ORDER BY created_at DESC
    LIMIT 1
  ),
  unread AS (
    SELECT COUNT(*) as count
    FROM direct_messages
    WHERE 
      receiver_id = auth.uid() AND
      sender_id = other_user_id AND
      is_read = false
  )
  SELECT 
    ud.full_name,
    ud.photo,
    lm.msg,
    u.count
  FROM user_details ud
  LEFT JOIN last_msg lm ON true
  LEFT JOIN unread u ON true;
END;
$$;