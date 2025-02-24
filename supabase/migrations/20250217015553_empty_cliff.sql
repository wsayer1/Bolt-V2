/*
  # Create events table with mock data

  1. New Tables
    - `events`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `location` (text)
      - `date` (timestamptz)
      - `image_url` (text)
      - `host_id` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - `max_attendees` (integer)
      - `current_attendees` (integer)
      - `status` (text)

  2. Security
    - Enable RLS on `events` table
    - Add policies for:
      - Anyone can read events
      - Authenticated users can create events
      - Event hosts can update their own events
*/

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  location text NOT NULL,
  date timestamptz NOT NULL,
  image_url text,
  host_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  max_attendees integer,
  current_attendees integer DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed'))
);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Policies
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

-- Insert mock data
INSERT INTO events (title, description, location, date, image_url, max_attendees, status)
VALUES
  (
    'Tech Meetup 2025',
    'Join us for an evening of networking and tech talks from industry leaders.',
    'Innovation Hub, Downtown',
    '2025-03-15 18:00:00+00',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    100,
    'active'
  ),
  (
    'Community Garden Workshop',
    'Learn sustainable gardening practices and help build our community garden.',
    'Green Park Community Center',
    '2025-04-02 10:00:00+00',
    'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=800',
    30,
    'active'
  ),
  (
    'Art & Wine Evening',
    'Experience local art while enjoying premium wines from regional vineyards.',
    'Metropolitan Art Gallery',
    '2025-03-28 19:00:00+00',
    'https://images.unsplash.com/photo-1543362906-acfc16c67564?w=800',
    50,
    'active'
  ),
  (
    'Fitness Boot Camp',
    'High-intensity workout session led by professional trainers.',
    'Sunrise Fitness Center',
    '2025-03-20 07:00:00+00',
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800',
    20,
    'active'
  ),
  (
    'Cooking Masterclass',
    'Learn to cook authentic Italian cuisine with Chef Maria Romano.',
    'Culinary Institute',
    '2025-04-10 16:00:00+00',
    'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800',
    15,
    'active'
  );