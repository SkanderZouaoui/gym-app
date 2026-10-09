-- AlterTable: users gets a stable, reusable referral code
ALTER TABLE "users" ADD COLUMN     "referral_code" TEXT;

-- Backfill: carry over each referrer's existing (deterministic) code so
-- existing shared links keep working after the model change.
UPDATE "users" u
SET "referral_code" = r."code"
FROM "referrals" r
WHERE r."referrer_id" = u."id" AND u."referral_code" IS NULL;

CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- AlterEnum: PENDING no longer exists — every Referral row now represents a
-- completed referral (one row per referee, code lives on User instead).
BEGIN;
CREATE TYPE "ReferralStatus_new" AS ENUM ('COMPLETED', 'REWARDED');
ALTER TABLE "public"."referrals" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "referrals" ALTER COLUMN "status" TYPE "ReferralStatus_new" USING ("status"::text::"ReferralStatus_new");
ALTER TYPE "ReferralStatus" RENAME TO "ReferralStatus_old";
ALTER TYPE "ReferralStatus_new" RENAME TO "ReferralStatus";
DROP TYPE "public"."ReferralStatus_old";
ALTER TABLE "referrals" ALTER COLUMN "status" SET DEFAULT 'COMPLETED';
COMMIT;

-- DropForeignKey
ALTER TABLE "referrals" DROP CONSTRAINT "referrals_referee_id_fkey";

-- DropIndex: `code` is no longer unique per row — it's shared across all
-- referrals created from the same referrer's link.
DROP INDEX "referrals_code_key";

-- AlterTable: refereeId becomes required and unique (a person can only ever
-- be referred once).
ALTER TABLE "referrals" ALTER COLUMN "referee_id" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'COMPLETED';

CREATE UNIQUE INDEX "referrals_referee_id_key" ON "referrals"("referee_id");

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referee_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
