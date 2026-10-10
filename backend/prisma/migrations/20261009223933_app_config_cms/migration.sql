-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('STRENGTH', 'CARDIO', 'MOBILITY');

-- CreateEnum
CREATE TYPE "AppConfigStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "class_types" ADD COLUMN     "default_capacity" INTEGER NOT NULL DEFAULT 16,
ADD COLUMN     "default_duration_min" INTEGER NOT NULL DEFAULT 45,
ADD COLUMN     "icon" TEXT NOT NULL DEFAULT 'fitness_center',
ADD COLUMN     "is_bookable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tone" TEXT NOT NULL DEFAULT 'primary';

-- AlterTable
ALTER TABLE "exercises" ADD COLUMN     "level" TEXT,
ADD COLUMN     "type" "ExerciseType" NOT NULL DEFAULT 'STRENGTH';

-- AlterTable
ALTER TABLE "membership_plans" ADD COLUMN     "display_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "includes_label" TEXT,
ADD COLUMN     "is_popular" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_visible_in_app" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "app_config_versions" (
    "id" TEXT NOT NULL,
    "status" "AppConfigStatus" NOT NULL DEFAULT 'DRAFT',
    "version_number" INTEGER NOT NULL,
    "note" TEXT,
    "branding" JSONB NOT NULL DEFAULT '{}',
    "home_modules" JSONB NOT NULL DEFAULT '[]',
    "tabs" JSONB NOT NULL DEFAULT '[]',
    "strings" JSONB NOT NULL DEFAULT '[]',
    "languages" JSONB NOT NULL DEFAULT '{}',
    "notif_settings" JSONB NOT NULL DEFAULT '{}',
    "booking_rules" JSONB NOT NULL DEFAULT '{}',
    "changed_keys" JSONB NOT NULL DEFAULT '[]',
    "published_by" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_config_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "role" "RoleName" NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_config_versions_status_idx" ON "app_config_versions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_permission_role_key" ON "role_permissions"("permission", "role");

-- AddForeignKey
ALTER TABLE "app_config_versions" ADD CONSTRAINT "app_config_versions_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
