-- AlterTable
ALTER TABLE "login_attempts" ADD COLUMN     "lock_count" INTEGER NOT NULL DEFAULT 0;
