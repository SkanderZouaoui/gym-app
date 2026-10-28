-- AlterTable
ALTER TABLE "class_types" ADD COLUMN "gallery_keys" TEXT[] DEFAULT ARRAY[]::TEXT[];
