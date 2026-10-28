-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('CLASS_REMINDER', 'WAITLIST_PROMOTED', 'MEMBERSHIP_EXPIRING', 'ANNOUNCEMENT', 'ATTENDANCE_CONFIRMED', 'PERSONAL_RECORD');
ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "public"."NotificationType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "challenge_participations" DROP CONSTRAINT "challenge_participations_challenge_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_participations" DROP CONSTRAINT "challenge_participations_user_id_fkey";

-- DropForeignKey
ALTER TABLE "coach_availabilities" DROP CONSTRAINT "coach_availabilities_coach_id_fkey";

-- DropForeignKey
ALTER TABLE "coaching_sessions" DROP CONSTRAINT "coaching_sessions_coach_id_fkey";

-- DropForeignKey
ALTER TABLE "coaching_sessions" DROP CONSTRAINT "coaching_sessions_member_id_fkey";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_author_id_fkey";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_post_id_fkey";

-- DropForeignKey
ALTER TABLE "conversation_participants" DROP CONSTRAINT "conversation_participants_conversation_id_fkey";

-- DropForeignKey
ALTER TABLE "conversation_participants" DROP CONSTRAINT "conversation_participants_user_id_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_conversation_id_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_sender_id_fkey";

-- DropForeignKey
ALTER TABLE "points_transactions" DROP CONSTRAINT "points_transactions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "posts" DROP CONSTRAINT "posts_author_id_fkey";

-- DropForeignKey
ALTER TABLE "product_reservations" DROP CONSTRAINT "product_reservations_product_id_fkey";

-- DropForeignKey
ALTER TABLE "product_reservations" DROP CONSTRAINT "product_reservations_user_id_fkey";

-- DropForeignKey
ALTER TABLE "reactions" DROP CONSTRAINT "reactions_post_id_fkey";

-- DropForeignKey
ALTER TABLE "reactions" DROP CONSTRAINT "reactions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "referrals" DROP CONSTRAINT "referrals_referee_id_fkey";

-- DropForeignKey
ALTER TABLE "referrals" DROP CONSTRAINT "referrals_referrer_id_fkey";

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_reported_by_fkey";

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_resolved_by_fkey";

-- DropForeignKey
ALTER TABLE "user_badges" DROP CONSTRAINT "user_badges_badge_id_fkey";

-- DropForeignKey
ALTER TABLE "user_badges" DROP CONSTRAINT "user_badges_user_id_fkey";

-- DropIndex
DROP INDEX "users_referral_code_key";

-- AlterTable
ALTER TABLE "coach_profiles" DROP COLUMN "rating",
DROP COLUMN "review_count",
DROP COLUMN "session_price";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "referral_code";

-- DropTable
DROP TABLE "badges";

-- DropTable
DROP TABLE "challenge_participations";

-- DropTable
DROP TABLE "challenges";

-- DropTable
DROP TABLE "coach_availabilities";

-- DropTable
DROP TABLE "coaching_sessions";

-- DropTable
DROP TABLE "comments";

-- DropTable
DROP TABLE "conversation_participants";

-- DropTable
DROP TABLE "conversations";

-- DropTable
DROP TABLE "messages";

-- DropTable
DROP TABLE "points_transactions";

-- DropTable
DROP TABLE "posts";

-- DropTable
DROP TABLE "product_reservations";

-- DropTable
DROP TABLE "products";

-- DropTable
DROP TABLE "reactions";

-- DropTable
DROP TABLE "referrals";

-- DropTable
DROP TABLE "reports";

-- DropTable
DROP TABLE "user_badges";

-- DropEnum
DROP TYPE "BadgeCriterionType";

-- DropEnum
DROP TYPE "ChallengeMetric";

-- DropEnum
DROP TYPE "CoachingSessionStatus";

-- DropEnum
DROP TYPE "ProductReservationStatus";

-- DropEnum
DROP TYPE "ReferralStatus";

-- DropEnum
DROP TYPE "ReportStatus";

