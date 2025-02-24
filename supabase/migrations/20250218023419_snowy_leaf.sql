/*
  # Add example events and attendees

  1. Changes
    - Insert 5 example events with different themes and details
    - Add random attendees to these events
    - Ensure proper host assignments
*/

-- First, get a list of user IDs to use as hosts and attendees
WITH user_ids AS (
  SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 5
)

-- Insert example events
INSERT INTO events (
  title,
  description,
  location,
  date,
  image_url,
  max_attendees,
  host_id,
  current_attendees
)
SELECT
  unnest(ARRAY[
    'Community Yoga in the Park',
    'Tech Meetup: Future of AI',
    'Local Art Exhibition',
    'Cooking Workshop: Italian Cuisine',
    'Photography Walk: Urban Landscapes'
  ]) as title,
  unnest(ARRAY[
    'Join us for a relaxing morning of yoga in the park. All skill levels welcome. Bring your own mat!',
    'Explore the latest developments in AI and machine learning with industry experts. Networking session included.',
    'Discover local artists and their unique perspectives. Wine and cheese will be served.',
    'Learn authentic Italian cooking techniques from Chef Maria. Limited spots available!',
    'Capture the beauty of urban architecture and street life. Professional guidance provided.'
  ]) as description,
  unnest(ARRAY[
    'Central Park',
    'Innovation Hub',
    'Metropolitan Gallery',
    'Culinary Institute',
    'City Center'
  ]) as location,
  unnest(ARRAY[
    '2025-03-15 09:00:00+00',
    '2025-03-20 18:30:00+00',
    '2025-03-25 19:00:00+00',
    '2025-04-01 17:00:00+00',
    '2025-04-05 16:00:00+00'
  ]::timestamptz[]) as date,
  unnest(ARRAY[
    'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800',
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800',
    'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800',
    'https://images.unsplash.com/photo-1507048331197-7d4ac70811cf?w=800',
    'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800'
  ]) as image_url,
  unnest(ARRAY[20, 50, 100, 15, 25]) as max_attendees,
  (SELECT id FROM user_ids ORDER BY random() LIMIT 1) as host_id,
  0;

-- Add random attendees to events
WITH users AS (
  SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 5
),
events_ids AS (
  SELECT id FROM events ORDER BY created_at DESC LIMIT 5
)
INSERT INTO event_attendees (event_id, user_id)
SELECT 
  e.id as event_id,
  u.id as user_id
FROM events_ids e
CROSS JOIN users u
WHERE random() < 0.7  -- 70% chance of each user attending each event
ON CONFLICT (event_id, user_id) DO NOTHING;