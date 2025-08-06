
-- Ensure author_id is properly set as UUID type
ALTER TABLE "posts" ALTER COLUMN "author_id" TYPE uuid USING "author_id"::uuid;

-- Also ensure the foreign key constraint exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'posts_author_id_users_id_fk'
    ) THEN
        ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" 
        FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE cascade;
    END IF;
END $$;
