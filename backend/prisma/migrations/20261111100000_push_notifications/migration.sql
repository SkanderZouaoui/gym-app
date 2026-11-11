-- Envoi push : suivi par notification et date de dernière activité d'un appareil.
ALTER TABLE "notifications" ADD COLUMN "pushed_at" TIMESTAMP(3);
-- Les notifications existantes ne doivent pas être renvoyées en push.
UPDATE "notifications" SET "pushed_at" = "created_at";
CREATE INDEX "notifications_pushed_at_idx" ON "notifications"("pushed_at");

ALTER TABLE "device_tokens" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
