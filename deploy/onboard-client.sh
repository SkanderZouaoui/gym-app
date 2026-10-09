#!/usr/bin/env bash
# Procédure d'onboarding d'un nouveau client (section 14.4).
#
# Usage : ./deploy/onboard-client.sh <nom-client>
#
# Étapes : génère les secrets manquants dans deploy/clients/<nom>/.env,
# démarre l'infra et l'API, applique les migrations, initialise le
# stockage Garage (bucket + clé S3), puis affiche la commande pour créer
# le premier compte admin.
set -euo pipefail

CLIENT_NAME="${1:-}"
if [ -z "$CLIENT_NAME" ]; then
  echo "Usage: $0 <nom-client>" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLIENT_DIR="$ROOT_DIR/deploy/clients/$CLIENT_NAME"
ENV_FILE="$CLIENT_DIR/.env"

if [ ! -d "$CLIENT_DIR" ]; then
  echo "Création de $CLIENT_DIR à partir du modèle 'exemple'..."
  cp -r "$ROOT_DIR/deploy/clients/exemple" "$CLIENT_DIR"
fi

if [ ! -f "$ENV_FILE" ]; then
  cp "$CLIENT_DIR/.env.example" "$ENV_FILE"
fi

# Génère les secrets JWT/QR s'ils sont vides.
generate_secret_if_empty() {
  local key="$1"
  local current
  current=$(grep -E "^${key}=" "$ENV_FILE" | cut -d'=' -f2- || true)
  if [ -z "$current" ]; then
    local value
    value=$(openssl rand -hex 32)
    sed -i.bak "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    rm -f "$ENV_FILE.bak"
    echo "  - ${key} généré"
  fi
}

echo "== 1. Génération des secrets manquants =="
generate_secret_if_empty "JWT_ACCESS_SECRET"
generate_secret_if_empty "JWT_REFRESH_SECRET"
generate_secret_if_empty "QR_KEY_ENCRYPTION_SECRET"
generate_secret_if_empty "POSTGRES_PASSWORD"

echo "== 2. Démarrage de l'infra et de l'API =="
docker compose -f "$ROOT_DIR/docker-compose.prod.yml" --env-file "$ENV_FILE" -p "muscleup-$CLIENT_NAME" up -d --build

echo "== 3. Attente de la disponibilité de l'API =="
API_PORT=$(grep -E "^API_PORT=" "$ENV_FILE" | cut -d'=' -f2 || echo 3000)
for _ in $(seq 1 30); do
  if curl -sf "http://localhost:${API_PORT}/v1/admin/settings" -o /dev/null 2>/dev/null; then
    break
  fi
  if curl -s "http://localhost:${API_PORT}/v1/admin/settings" -o /dev/null -w "%{http_code}" 2>/dev/null | grep -q "401"; then
    break
  fi
  sleep 2
done
echo "  - API disponible sur le port ${API_PORT}"

echo "== 4. Initialisation du stockage Garage (bucket + clé S3) =="
echo "  Exécuter manuellement si ce n'est pas déjà fait :"
echo "    CONTAINER=muscleup-${CLIENT_NAME}-garage-1 $ROOT_DIR/minio/init.sh"
echo "  Puis reporter les clés S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY dans $ENV_FILE"
echo "  et relancer : docker compose -f $ROOT_DIR/docker-compose.prod.yml --env-file $ENV_FILE -p muscleup-$CLIENT_NAME up -d api"

echo
echo "== 5. Prochaine étape manuelle : créer le premier compte admin =="
echo "  curl -X POST http://localhost:${API_PORT}/v1/auth/register -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"admin@${CLIENT_NAME}.com\",\"password\":\"change-me\",\"firstName\":\"Admin\",\"lastName\":\"${CLIENT_NAME}\"}'"
echo "  Puis promouvoir ce compte en ADMIN directement en base (premier admin, avant que le back-office existe) :"
echo "    UPDATE user_roles SET role = 'ADMIN' WHERE user_id = '<id-du-compte>';"
echo
echo "Onboarding de '$CLIENT_NAME' terminé."
