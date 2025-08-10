
-- Add media fields to posts table
ALTER TABLE posts ALTER COLUMN content DROP NOT NULL;
ALTER TABLE posts ADD COLUMN media_type VARCHAR(20) DEFAULT 'text';
ALTER TABLE posts ADD COLUMN media_url TEXT;
