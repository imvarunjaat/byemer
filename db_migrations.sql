-- Database migrations applied on 2025-06-29
-- These changes fix issues with missing columns in room_participants table

-- Add is_active column to room_participants table
ALTER TABLE room_participants ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Add last_seen_at column to room_participants table
ALTER TABLE room_participants ADD COLUMN last_seen_at TIMESTAMPTZ DEFAULT now();

-- Add nickname column to room_participants table
ALTER TABLE room_participants ADD COLUMN nickname TEXT;

-- Add joined_at column to room_participants table if it doesn't exist
-- DO $$ 
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1
--     FROM information_schema.columns
--     WHERE table_name = 'room_participants'
--     AND column_name = 'joined_at'
--   ) THEN
--     ALTER TABLE room_participants ADD COLUMN joined_at TIMESTAMPTZ DEFAULT now();
--   END IF;
-- END $$;

-- Enable Realtime for the messages table
-- This fixes the "Unable to subscribe to changes" error
-- CREATE PUBLICATION IF NOT EXISTS supabase_realtime;
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
