/*
  # Create users profile table and sample data

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `birthday` (date)
      - `hometown` (text)
      - `current_location` (text)
      - `languages` (text[])
      - `hobbies` (text[])
      - `bio` (text)
      - `photos` (text[])
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `profiles` table
    - Add policies for authenticated users to read all profiles
    - Add policy for users to update their own profile

  3. Sample Data
    - Create sample profiles with predefined UUIDs
*/

-- First, create the profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY,
  birthday date,
  hometown text,
  current_location text,
  languages text[],
  hobbies text[],
  bio text,
  photos text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read profiles"
  ON profiles
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Insert sample profiles with predefined UUIDs
INSERT INTO profiles (id, birthday, hometown, current_location, languages, hobbies, bio, photos)
VALUES
  (
    'a1b2c3d4-e5f6-4321-8765-1a2b3c4d5e6f',
    '1990-05-16',
    'Sydney',
    'Blue Mountains',
    ARRAY['English', 'Learning Spanish'],
    ARRAY['Surfing', 'Mountaineering', 'Tennis', 'Traveling'],
    'As an experienced yogi and a dedicated practicing mum, I am passionate about sharing the benefits of yoga with others. I am looking to facilitate engaging and rejuvenating yoga classes in my neighbourhood.',
    ARRAY[
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
      'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=400',
      'https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=400'
    ]
  ),
  (
    'b2c3d4e5-f6a1-5432-8765-2b3c4d5e6f1a',
    '1988-03-21',
    'Melbourne',
    'Sydney',
    ARRAY['English', 'Mandarin'],
    ARRAY['Photography', 'Hiking', 'Cooking'],
    'Urban explorer and food enthusiast. Always seeking new adventures and flavors.',
    ARRAY[
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
      'https://images.unsplash.com/photo-1542596594-649edbc13630?w=400'
    ]
  ),
  (
    'c3d4e5f6-a1b2-6543-8765-3c4d5e6f1a2b',
    '1995-11-08',
    'Brisbane',
    'Gold Coast',
    ARRAY['English', 'Japanese'],
    ARRAY['Surfing', 'Music Production', 'Gaming'],
    'Digital nomad and wave chaser. Creating beats when not catching waves.',
    ARRAY[
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
      'https://images.unsplash.com/photo-1548372290-8d01b6c8e78c?w=400'
    ]
  );