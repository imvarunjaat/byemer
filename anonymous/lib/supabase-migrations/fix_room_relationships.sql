-- Step 1: Verify if tables exist and create them if not

-- Check if rooms table exists, create if not
CREATE TABLE IF NOT EXISTS "public"."rooms" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "created_at" timestamp WITH time zone DEFAULT now(),
    "name" text NOT NULL,
    "created_by" uuid REFERENCES auth.users(id),
    "is_private" boolean DEFAULT false,
    "access_code" text,
    "created_by_email" text,
    PRIMARY KEY ("id")
);

-- Check if user_recent_rooms table exists, create if not
CREATE TABLE IF NOT EXISTS "public"."user_recent_rooms" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "created_at" timestamp WITH time zone DEFAULT now(),
    "user_id" uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    "room_id" uuid,
    "last_accessed" timestamp WITH time zone DEFAULT now(),
    "emoji" text DEFAULT '💬'::text,
    "nickname" text,
    PRIMARY KEY ("id")
);

-- Step 2: Add unique constraint to prevent duplicates
ALTER TABLE IF EXISTS "public"."user_recent_rooms" 
DROP CONSTRAINT IF EXISTS "user_recent_rooms_user_id_room_id_key";

ALTER TABLE IF EXISTS "public"."user_recent_rooms" 
ADD CONSTRAINT "user_recent_rooms_user_id_room_id_key" 
UNIQUE ("user_id", "room_id");

-- Step 3: Fix the foreign key relationship
-- First drop existing constraint if any
ALTER TABLE IF EXISTS "public"."user_recent_rooms" 
DROP CONSTRAINT IF EXISTS "user_recent_rooms_room_id_fkey";

-- Re-add the correct foreign key constraint
ALTER TABLE IF EXISTS "public"."user_recent_rooms" 
ADD CONSTRAINT "user_recent_rooms_room_id_fkey" 
FOREIGN KEY ("room_id") 
REFERENCES "public"."rooms"("id") 
ON DELETE CASCADE;

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS "rooms_created_by_idx" ON "public"."rooms" ("created_by");
CREATE INDEX IF NOT EXISTS "user_recent_rooms_user_id_idx" ON "public"."user_recent_rooms" ("user_id");
CREATE INDEX IF NOT EXISTS "user_recent_rooms_room_id_idx" ON "public"."user_recent_rooms" ("room_id");
