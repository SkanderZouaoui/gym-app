-- AlterTable
ALTER TABLE "organization_settings" ADD COLUMN     "occupancy_policy" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "public_ip" TEXT,
ADD COLUMN     "public_ip_updated_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "user_presence_signals" (
    "user_id" TEXT NOT NULL,
    "last_seen_wifi_at" TIMESTAMP(3),
    "last_seen_any_network_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_presence_signals_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "occupancy_overrides" (
    "id" TEXT NOT NULL,
    "manual_count" INTEGER NOT NULL,
    "set_by" TEXT NOT NULL,
    "set_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "cleared_at" TIMESTAMP(3),
    "cleared_by" TEXT,

    CONSTRAINT "occupancy_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "occupancy_snapshots" (
    "id" TEXT NOT NULL,
    "taken_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estimate" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "wifi_count" INTEGER NOT NULL,
    "other_network_count" INTEGER NOT NULL,

    CONSTRAINT "occupancy_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_presence_signals_last_seen_any_network_at_idx" ON "user_presence_signals"("last_seen_any_network_at");

-- CreateIndex
CREATE INDEX "user_presence_signals_last_seen_wifi_at_idx" ON "user_presence_signals"("last_seen_wifi_at");

-- CreateIndex
CREATE INDEX "occupancy_overrides_expires_at_idx" ON "occupancy_overrides"("expires_at");

-- CreateIndex
CREATE INDEX "occupancy_snapshots_taken_at_idx" ON "occupancy_snapshots"("taken_at");

-- AddForeignKey
ALTER TABLE "user_presence_signals" ADD CONSTRAINT "user_presence_signals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupancy_overrides" ADD CONSTRAINT "occupancy_overrides_set_by_fkey" FOREIGN KEY ("set_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupancy_overrides" ADD CONSTRAINT "occupancy_overrides_cleared_by_fkey" FOREIGN KEY ("cleared_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

