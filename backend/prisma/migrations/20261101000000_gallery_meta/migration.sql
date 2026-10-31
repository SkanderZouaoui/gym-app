-- Miniatures et aperçus flous des photos de galerie (cours et salles)
ALTER TABLE "class_types" ADD COLUMN "gallery_meta" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "rooms" ADD COLUMN "gallery_meta" JSONB NOT NULL DEFAULT '{}';
