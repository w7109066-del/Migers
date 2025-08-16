
CREATE TABLE "user_statistics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"game_wins" integer DEFAULT 0,
	"game_losses" integer DEFAULT 0,
	"coins_earned" integer DEFAULT 0,
	"coins_spent" integer DEFAULT 0,
	"gifts_sent" integer DEFAULT 0,
	"gifts_received" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

ALTER TABLE "user_statistics" ADD CONSTRAINT "user_statistics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;

-- Add index for better performance
CREATE INDEX "user_statistics_user_id_idx" ON "user_statistics" ("user_id");
CREATE INDEX "user_statistics_date_idx" ON "user_statistics" ("date");
CREATE UNIQUE INDEX "user_statistics_user_date_idx" ON "user_statistics" ("user_id", "date");
