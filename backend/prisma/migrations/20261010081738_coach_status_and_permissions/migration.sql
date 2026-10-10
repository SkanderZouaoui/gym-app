-- CreateEnum
CREATE TYPE "CoachStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "coach_profiles" ADD COLUMN     "status" "CoachStatus" NOT NULL DEFAULT 'ACTIVE';
