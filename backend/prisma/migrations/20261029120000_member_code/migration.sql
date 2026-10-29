-- AlterTable
ALTER TABLE "users" ADD COLUMN "member_code" TEXT;

-- Codes à 6 chiffres pour les comptes existants : (n × 7919) mod 900000 + 100000 est une bijection
-- (7919 est premier avec 900000), donc sans doublon.
UPDATE "users" u
SET "member_code" = ((r.n * 7919) % 900000 + 100000)::text
FROM (SELECT id, row_number() OVER (ORDER BY created_at, id) AS n FROM "users") r
WHERE u.id = r.id;

-- CreateIndex
CREATE UNIQUE INDEX "users_member_code_key" ON "users"("member_code");
