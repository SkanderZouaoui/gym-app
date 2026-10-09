-- AlterTable
ALTER TABLE "workout_logs" ADD COLUMN     "day_id" TEXT,
ADD COLUMN     "program_id" TEXT;

-- AddForeignKey
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_day_id_fkey" FOREIGN KEY ("day_id") REFERENCES "program_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;
