-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('WEEKLY');

-- CreateEnum
CREATE TYPE "ClassSessionStatus" AS ENUM ('SCHEDULED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CheckInMethod" AS ENUM ('QR', 'MANUAL', 'WALK_IN');

-- CreateEnum
CREATE TYPE "QrSigningKeyStatus" AS ENUM ('ACTIVE', 'ROTATED', 'REVOKED');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "attended_at" TIMESTAMP(3),
ADD COLUMN     "booking_code" TEXT NOT NULL,
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "check_in_method" "CheckInMethod",
ADD COLUMN     "checked_in_by" TEXT,
ADD COLUMN     "is_cross_branch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "waitlist_position" INTEGER;

-- AlterTable
ALTER TABLE "class_sessions" ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "cancelled_reason" TEXT,
ADD COLUMN     "class_type_id" TEXT NOT NULL,
ADD COLUMN     "coach_id" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "no_show_processed_at" TIMESTAMP(3),
ADD COLUMN     "open_to_other_branches" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "ClassSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
ADD COLUMN     "template_id" TEXT;

-- AlterTable
ALTER TABLE "coaching_sessions" ADD COLUMN     "coach_id" TEXT NOT NULL,
ADD COLUMN     "member_id" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'CONFIRMED';

-- CreateTable
CREATE TABLE "class_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "level" TEXT,
    "image_key" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "class_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_templates" (
    "id" TEXT NOT NULL,
    "class_type_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "room_id" TEXT,
    "coach_id" TEXT,
    "capacity" INTEGER NOT NULL,
    "frequency" "RecurrenceFrequency" NOT NULL DEFAULT 'WEEKLY',
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_scan_logs" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT,
    "scanned_by" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "reason_code" TEXT NOT NULL,
    "offline" BOOLEAN NOT NULL DEFAULT false,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_scan_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_signing_keys" (
    "kid" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "private_key_enc" TEXT NOT NULL,
    "status" "QrSigningKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotated_at" TIMESTAMP(3),

    CONSTRAINT "qr_signing_keys_pkey" PRIMARY KEY ("kid")
);

-- CreateTable
CREATE TABLE "used_qr_tokens" (
    "jti" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "used_qr_tokens_pkey" PRIMARY KEY ("jti")
);

-- CreateIndex
CREATE INDEX "class_templates_branch_id_idx" ON "class_templates"("branch_id");

-- CreateIndex
CREATE INDEX "attendance_scan_logs_session_id_scanned_at_idx" ON "attendance_scan_logs"("session_id", "scanned_at");

-- CreateIndex
CREATE INDEX "used_qr_tokens_expires_at_idx" ON "used_qr_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_booking_code_key" ON "bookings"("booking_code");

-- CreateIndex
CREATE INDEX "bookings_user_id_idx" ON "bookings"("user_id");

-- CreateIndex
CREATE INDEX "bookings_booking_code_idx" ON "bookings"("booking_code");

-- CreateIndex
CREATE UNIQUE INDEX "booking_session_user_active_unique" ON "bookings"("session_id", "user_id");

-- CreateIndex
CREATE INDEX "class_sessions_coach_id_starts_at_idx" ON "class_sessions"("coach_id", "starts_at");

-- CreateIndex
CREATE INDEX "coaching_sessions_coach_id_starts_at_idx" ON "coaching_sessions"("coach_id", "starts_at");

-- AddForeignKey
ALTER TABLE "class_templates" ADD CONSTRAINT "class_templates_class_type_id_fkey" FOREIGN KEY ("class_type_id") REFERENCES "class_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_templates" ADD CONSTRAINT "class_templates_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_templates" ADD CONSTRAINT "class_templates_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_templates" ADD CONSTRAINT "class_templates_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coach_profiles"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "class_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_class_type_id_fkey" FOREIGN KEY ("class_type_id") REFERENCES "class_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coach_profiles"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_checked_in_by_fkey" FOREIGN KEY ("checked_in_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_scan_logs" ADD CONSTRAINT "attendance_scan_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "class_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaching_sessions" ADD CONSTRAINT "coaching_sessions_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coach_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaching_sessions" ADD CONSTRAINT "coaching_sessions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

