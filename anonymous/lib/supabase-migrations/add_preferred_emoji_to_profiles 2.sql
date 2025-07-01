-- Add preferred_emoji column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_emoji TEXT DEFAULT '🎭';

-- Update existing rows to have a default emoji if needed
UPDATE profiles SET preferred_emoji = '🎭' WHERE preferred_emoji IS NULL;
