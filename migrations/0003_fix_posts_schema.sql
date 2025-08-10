
-- Fix any potential data type issues in posts table
ALTER TABLE "posts" ALTER COLUMN "author_id" TYPE uuid USING "author_id"::uuid;
