
ALTER TABLE "users" ADD COLUMN "is_merchant" boolean DEFAULT false;
ALTER TABLE "users" ADD COLUMN "merchant_registered_at" timestamp;
ALTER TABLE "users" ADD COLUMN "last_recharge_at" timestamp;
