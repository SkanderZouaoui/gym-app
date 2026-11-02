#!/usr/bin/env bash
# Lance Muscle UP (base de données + API + back-office) dans un GitHub Codespace
# et rend le back-office + l'app Expo Go accessibles depuis n'importe quel réseau.
# Usage : bash setup-codespace.sh
set -euo pipefail
cd "$(dirname "$0")"

corepack enable >/dev/null 2>&1 || npm i -g pnpm
pnpm install

# Images depuis le miroir Google si Docker Hub limite (429)
for img in library/postgres:16-alpine library/redis:7-alpine axllent/mailpit:latest; do
  docker pull -q "${img#library/}" 2>/dev/null || { docker pull -q "mirror.gcr.io/$img" && docker tag "mirror.gcr.io/$img" "${img#library/}"; }
done
docker compose up -d postgres redis mailpit
until docker compose exec -T postgres pg_isready >/dev/null 2>&1; do sleep 1; done

pnpm --filter "./packages/*" build

API_URL="https://${CODESPACE_NAME}-3001.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
BO_URL="https://${CODESPACE_NAME}-5173.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"

cd backend
if [ ! -f .env ]; then
  cp .env.example .env
  sed -i "s/^PORT=.*/PORT=3001/; s/change-me-access-secret/$(openssl rand -hex 24)/; s/change-me-refresh-secret/$(openssl rand -hex 24)/; s/change-me-qr-key-encryption-secret/$(openssl rand -hex 24)/; s#^PUBLIC_API_URL=.*#PUBLIC_API_URL=$API_URL#" .env
fi
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm db:seed
cat > prisma/_mk-member.ts <<'EOF'
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
const p = new PrismaClient();
(async () => {
  const email = 'member-phase2@muscleup.dev';
  if (!(await p.user.findUnique({ where: { email } })))
    await p.user.create({ data: { email, firstName: 'Adam', lastName: 'Membre', passwordHash: await argon2.hash('Muscle123!'), roles: { create: [{ role: 'MEMBER' }] } } });
  await p.$disconnect();
})();
EOF
for s in _mk-member seed-demo-home seed-classes seed-demo-programs seed-demo-training seed-demo-cash; do
  pnpm exec tsx "prisma/$s.ts" || echo "seed $s ignoré"
done
rm -f prisma/_mk-member.ts
cd ..

# Lancement en arrière-plan
(cd backend && PORT=3001 nohup pnpm start:dev > ../backend.log 2>&1 &)
(cd backoffice && VITE_API_URL="$API_URL" __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=".app.github.dev" \
  nohup pnpm dev --host 0.0.0.0 --port 5173 > ../backoffice.log 2>&1 &)

echo "Attente du démarrage de l'API..."
until curl -s -o /dev/null localhost:3001; do sleep 2; done
until curl -s -o /dev/null localhost:5173; do sleep 1; done

# --- App mobile (Expo Go) via le tunnel Expo ---
npm ls -g @expo/ngrok >/dev/null 2>&1 || npm i -g @expo/ngrok@^4.1.0
(cd mobile && EXPO_PUBLIC_API_URL="$API_URL" CI=1 nohup npx expo start --tunnel --clear --port 8081 > ../expo.log 2>&1 &)
echo "Attente du tunnel Expo..."
EXPO_HOST=""
for i in $(seq 1 120); do
  EXPO_HOST=$(curl -s -H 'expo-platform: android' localhost:8081 2>/dev/null | grep -o '"hostUri":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
  case "$EXPO_HOST" in *exp.direct*) break;; esac
  sleep 2
done

gh codespace ports visibility 3001:public 5173:public -c "$CODESPACE_NAME" || \
  echo "⚠️  Passe les ports 3001 et 5173 en Public dans l'onglet PORTS."

echo
echo "✅ Back-office : $BO_URL"
echo "   API         : $API_URL"
echo "   Expo Go     : exp://${EXPO_HOST:-<voir expo.log>}"
echo "   Connexion   : admin-demo@ / coach-demo@ / staff-demo@ / member-phase2@muscleup.dev — Muscle123!"
echo "exp://${EXPO_HOST}" > expo-url.txt
