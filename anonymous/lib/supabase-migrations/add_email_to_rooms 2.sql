-- Add created_by_email column to rooms table to associate rooms with user emails
ALTER TABLE IF EXISTS "public"."rooms" ADD COLUMN IF NOT EXISTS "created_by_email" text;

-- Create index for faster lookups by email
CREATE INDEX IF NOT EXISTS "rooms_created_by_email_idx" ON "public"."rooms" ("created_by_email");

-- Update existing rooms with email information from profiles
UPDATE "public"."rooms" r
SET "created_by_email" = (
  SELECT "email" FROM "public"."profiles" p 
  WHERE p.id = r.created_by
)
WHERE "created_by_email" IS NULL;

-- Create foreign key relationship from rooms to user profiles
ALTER TABLE IF EXISTS "public"."rooms" 
ADD CONSTRAINT "rooms_created_by_email_fkey" 
FOREIGN KEY ("created_by_email") 
REFERENCES "public"."profiles"("email") 
ON DELETE CASCADE 
ON UPDATE CASCADE
NOT VALID; -- Use NOT VALID initially to prevent validation of existing data

-- Later validate the constraint once data is clean
ALTER TABLE IF EXISTS "public"."rooms" 
VALIDATE CONSTRAINT "rooms_created_by_email_fkey";
