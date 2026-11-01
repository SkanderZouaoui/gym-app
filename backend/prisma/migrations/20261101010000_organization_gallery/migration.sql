-- Galerie photos de l'établissement
ALTER TABLE "organization_settings" ADD COLUMN "gallery_keys" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "organization_settings" ADD COLUMN "gallery_meta" JSONB NOT NULL DEFAULT '{}';
