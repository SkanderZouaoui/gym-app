-- Les photos de progression adhérent sont supprimées (seuls restent avatars, galeries des cours, GIF d'exercices).
ALTER TABLE "body_metrics" DROP COLUMN "photo_key";
