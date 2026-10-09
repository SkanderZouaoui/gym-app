-- DropForeignKey
ALTER TABLE "announcements" DROP CONSTRAINT "announcements_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "challenges" DROP CONSTRAINT "challenges_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "class_sessions" DROP CONSTRAINT "class_sessions_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "class_templates" DROP CONSTRAINT "class_templates_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "coach_availabilities" DROP CONSTRAINT "coach_availabilities_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "coach_branches" DROP CONSTRAINT "coach_branches_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "coach_branches" DROP CONSTRAINT "coach_branches_coach_id_fkey";

-- DropForeignKey
ALTER TABLE "coaching_sessions" DROP CONSTRAINT "coaching_sessions_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "memberships" DROP CONSTRAINT "memberships_home_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "plan_branches" DROP CONSTRAINT "plan_branches_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "plan_branches" DROP CONSTRAINT "plan_branches_plan_id_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "user_branch_roles" DROP CONSTRAINT "user_branch_roles_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "user_branch_roles" DROP CONSTRAINT "user_branch_roles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_home_branch_id_fkey";

-- DropIndex
DROP INDEX "class_sessions_branch_id_starts_at_idx";

-- DropIndex
DROP INDEX "class_templates_branch_id_idx";

-- DropIndex
DROP INDEX "payments_branch_id_idx";

-- DropIndex
DROP INDEX "products_branch_id_idx";

-- DropIndex
DROP INDEX "rooms_branch_id_idx";

-- AlterTable
ALTER TABLE "announcements" DROP COLUMN "branch_id";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "branch_id";

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "is_cross_branch";

-- AlterTable
ALTER TABLE "challenges" DROP COLUMN "branch_id";

-- AlterTable
ALTER TABLE "class_sessions" DROP COLUMN "branch_id",
DROP COLUMN "open_to_other_branches";

-- AlterTable
ALTER TABLE "class_templates" DROP COLUMN "branch_id";

-- AlterTable
ALTER TABLE "coach_availabilities" DROP COLUMN "branch_id";

-- AlterTable
ALTER TABLE "coaching_sessions" DROP COLUMN "branch_id";

-- AlterTable
ALTER TABLE "membership_plans" DROP COLUMN "access_scope",
DROP COLUMN "cross_branch_booking",
DROP COLUMN "cross_branch_monthly_quota";

-- AlterTable
ALTER TABLE "memberships" DROP COLUMN "frozen_access_scope",
DROP COLUMN "home_branch_id";

-- AlterTable
ALTER TABLE "organization_settings" DROP COLUMN "multi_branch_policy";

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "branch_id";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "branch_id";

-- AlterTable
ALTER TABLE "rooms" DROP COLUMN "branch_id";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "home_branch_id";

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "RoleName" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- Preserve distinct (user_id, role) pairs from the per-branch grants before dropping that table
INSERT INTO "user_roles" ("id", "user_id", "role", "created_at")
SELECT DISTINCT ON ("user_id", "role") gen_random_uuid()::text, "user_id", "role", "created_at"
FROM "user_branch_roles";

-- CreateIndex
CREATE INDEX "user_roles_user_id_idx" ON "user_roles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_key" ON "user_roles"("user_id", "role");

-- DropTable
DROP TABLE "branches";

-- DropTable
DROP TABLE "coach_branches";

-- DropTable
DROP TABLE "plan_branches";

-- DropTable
DROP TABLE "user_branch_roles";

-- DropEnum
DROP TYPE "AccessScope";

-- DropEnum
DROP TYPE "CrossBranchBookingMode";

-- CreateIndex
CREATE INDEX "class_sessions_starts_at_idx" ON "class_sessions"("starts_at");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

