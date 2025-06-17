-- Migration to store user's room and chat associations in Supabase instead of local storage
-- This allows users to access their rooms and chats from any device after logging in

-- Create a table to track user's recent rooms with additional metadata
CREATE TABLE IF NOT EXISTS user_recent_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  last_accessed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  emoji TEXT DEFAULT '💬', -- Default emoji for rooms
  nickname TEXT, -- Store the nickname used in this room
  custom_name TEXT, -- Allow users to rename rooms for their own view
  is_pinned BOOLEAN DEFAULT false, -- Allow users to pin favorite rooms
  -- Add unique constraint to prevent duplicate entries for same user+room
  UNIQUE(user_id, room_id)
);

-- Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_user_recent_rooms_user_id ON user_recent_rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recent_rooms_last_accessed ON user_recent_rooms(last_accessed);
CREATE INDEX IF NOT EXISTS idx_user_recent_rooms_pinned ON user_recent_rooms(is_pinned) WHERE is_pinned = true;

-- Add RLS policies to secure the user_recent_rooms table
ALTER TABLE user_recent_rooms ENABLE ROW LEVEL SECURITY;

-- Allow users to view only their own recent rooms
CREATE POLICY user_recent_rooms_select_policy ON user_recent_rooms
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own recent rooms
CREATE POLICY user_recent_rooms_insert_policy ON user_recent_rooms
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own recent rooms
CREATE POLICY user_recent_rooms_update_policy ON user_recent_rooms
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own recent rooms
CREATE POLICY user_recent_rooms_delete_policy ON user_recent_rooms
  FOR DELETE USING (auth.uid() = user_id);

-- Modify messages table to ensure nickname is stored with each message
ALTER TABLE messages ADD COLUMN IF NOT EXISTS nickname TEXT;

-- Update room_participants table to include more user metadata
ALTER TABLE room_participants ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE room_participants ADD COLUMN IF NOT EXISTS custom_avatar TEXT;

-- Add function to automatically update the last_accessed field
CREATE OR REPLACE FUNCTION update_user_recent_room_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamp on room access
DROP TRIGGER IF EXISTS update_user_recent_room_timestamp_trigger ON user_recent_rooms;
CREATE TRIGGER update_user_recent_room_timestamp_trigger
  BEFORE UPDATE ON user_recent_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_user_recent_room_timestamp();
  
-- Create a view to easily get user's rooms with all necessary data
CREATE OR REPLACE VIEW user_rooms_view AS
SELECT 
  urr.id as user_recent_room_id,
  urr.user_id,
  urr.room_id,
  urr.last_accessed,
  urr.emoji,
  urr.nickname,
  urr.custom_name,
  urr.is_pinned,
  r.name as room_name,
  r.created_by,
  r.is_private,
  r.access_code,
  r.created_at as room_created_at,
  r.updated_at as room_updated_at
FROM 
  user_recent_rooms urr
JOIN 
  rooms r ON urr.room_id = r.id;

-- Add RLS policy to the view
ALTER VIEW user_rooms_view OWNER TO postgres;

-- Create row level security policy
CREATE POLICY user_rooms_view_policy ON user_rooms_view
  FOR SELECT USING (auth.uid() = user_id);

