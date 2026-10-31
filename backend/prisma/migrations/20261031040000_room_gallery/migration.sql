-- Photos des salles (ordre d'affichage = ordre du tableau)
ALTER TABLE "rooms" ADD COLUMN "gallery_keys" TEXT[] DEFAULT ARRAY[]::TEXT[];
