-- AlterTable
ALTER TABLE "workout_logs" ADD COLUMN "duration_seconds" INTEGER;

-- Séances existantes : durée exacte déduite des minutes enregistrées
UPDATE "workout_logs" SET "duration_seconds" = "duration_minutes" * 60 WHERE "duration_minutes" IS NOT NULL;
