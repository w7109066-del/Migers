
ALTER TABLE "direct_messages" ADD COLUMN "message_type" text DEFAULT 'text';
ALTER TABLE "direct_messages" ADD COLUMN "gift_data" text;
