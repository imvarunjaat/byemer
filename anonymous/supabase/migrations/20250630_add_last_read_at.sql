-- Add last_read_at column to user_recent_rooms table
ALTER TABLE user_recent_rooms ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ DEFAULT NOW();

-- Add index for performance optimization
CREATE INDEX IF NOT EXISTS idx_user_recent_rooms_last_read_at ON user_recent_rooms(last_read_at);

-- Update existing records to set last_read_at to last_accessed as a starting point
UPDATE user_recent_rooms SET last_read_at = last_accessed WHERE last_read_at IS NULL;
