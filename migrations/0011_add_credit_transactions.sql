
CREATE TABLE "credit_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
