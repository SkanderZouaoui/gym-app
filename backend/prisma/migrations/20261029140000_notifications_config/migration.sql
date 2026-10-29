ALTER TABLE "organization_settings" ADD COLUMN "config" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "announcements" ADD COLUMN "starts_on" DATE, ADD COLUMN "ends_on" DATE, ADD COLUMN "push" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "scheduled_notifications" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'Annonce',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "audience" TEXT NOT NULL DEFAULT 'ALL',
  "send_at" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "sent_count" INTEGER NOT NULL DEFAULT 0,
  "sent_at" TIMESTAMP(3),
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "scheduled_notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "scheduled_notifications_status_send_at_idx" ON "scheduled_notifications"("status", "send_at");

CREATE TABLE "notification_rules" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "audience" TEXT NOT NULL DEFAULT 'ALL',
  "condition" TEXT NOT NULL DEFAULT 'NONE',
  "days" INTEGER[],
  "time" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_run_on" DATE,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_rules_pkey" PRIMARY KEY ("id")
);
