
CREATE TABLE IF NOT EXISTS "custom_emojis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"emoji_code" varchar(50) NOT NULL UNIQUE,
	"file_url" text NOT NULL,
	"file_type" varchar(20) NOT NULL,
	"category" varchar(50) DEFAULT 'custom',
	"is_active" boolean DEFAULT true,
	"created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
	"created_at" timestamp DEFAULT now()
);
