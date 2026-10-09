-- AlterTable
ALTER TABLE "coach_profiles" ADD COLUMN     "rating" DECIMAL(2,1),
ADD COLUMN     "review_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "session_price" DECIMAL(10,2),
ADD COLUMN     "years_experience" INTEGER;
