-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "programs"
  ADD COLUMN "level" TEXT,
  ADD COLUMN "goal" TEXT,
  ADD COLUMN "status" "ProgramStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "rejection_note" TEXT,
  ADD COLUMN "is_public" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reviewed_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "programs_status_is_public_idx" ON "programs"("status", "is_public");
