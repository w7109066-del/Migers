
CREATE TABLE IF NOT EXISTS "gifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"price" integer NOT NULL,
	"description" text,
	"emoji" varchar(10),
	"file_url" text,
	"file_type" varchar(20),
	"created_at" timestamp DEFAULT now()
);
