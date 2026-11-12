CREATE TABLE "profile_badges" (
    "id" TEXT NOT NULL,
    "label_fr" TEXT NOT NULL,
    "label_en" TEXT,
    "label_ar" TEXT,
    "icon" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "profile_badges_pkey" PRIMARY KEY ("id")
);

-- Badges par défaut : ceux qui étaient jusqu'ici écrits en dur dans l'application.
INSERT INTO "profile_badges" ("id", "label_fr", "label_en", "label_ar", "icon", "rule", "threshold", "position") VALUES
  (gen_random_uuid()::text, 'Série 4 sem.', '4-week streak', 'سلسلة 4 أسابيع', 'local-fire-department', 'STREAK_WEEKS', 4, 0),
  (gen_random_uuid()::text, 'Premier cours', 'First class', 'أول حصة', 'bolt', 'SESSIONS', 1, 1),
  (gen_random_uuid()::text, '3 mois', '3 months', '3 أشهر', 'workspace-premium', 'MEMBER_MONTHS', 3, 2),
  (gen_random_uuid()::text, '50 séances', '50 sessions', '50 حصة', 'emoji-events', 'SESSIONS', 50, 3),
  (gen_random_uuid()::text, '100 séances', '100 sessions', '100 حصة', 'diamond', 'SESSIONS', 100, 4),
  (gen_random_uuid()::text, 'Assidu 90 %', '90% consistent', 'منتظم 90%', 'military-tech', 'ASSIDUITY', 90, 5);
