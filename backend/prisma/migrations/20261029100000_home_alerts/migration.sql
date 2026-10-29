-- CreateTable
CREATE TABLE "home_alerts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "audience" TEXT NOT NULL DEFAULT 'Tous',
    "starts_on" DATE NOT NULL,
    "ends_on" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "home_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "home_alerts_is_active_starts_on_ends_on_idx" ON "home_alerts"("is_active", "starts_on", "ends_on");
