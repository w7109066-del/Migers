
ALTER TABLE post_comments ADD COLUMN parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE;
