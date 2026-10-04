#!/usr/bin/env bash
# Initialise le cluster Garage (layout single-node, bucket et clé S3) après
# le premier démarrage du conteneur. À relancer uniquement sur un volume vide.
set -euo pipefail

CONTAINER=muscleup-garage-1
BUCKET=muscleup
KEY_NAME=muscleup-backend

echo "Attente que Garage soit prêt..."
until docker exec "$CONTAINER" /garage status >/dev/null 2>&1; do
  sleep 1
done

NODE_ID=$(docker exec "$CONTAINER" /garage status 2>/dev/null | tail -1 | awk '{print $1}')
echo "Nœud détecté: $NODE_ID"

docker exec "$CONTAINER" /garage layout assign -z dc1 -c 1G "$NODE_ID"
docker exec "$CONTAINER" /garage layout apply --version 1

docker exec "$CONTAINER" /garage bucket create "$BUCKET" || true
docker exec "$CONTAINER" /garage key create "$KEY_NAME" || true
docker exec "$CONTAINER" /garage bucket allow --read --write "$BUCKET" --key "$KEY_NAME"

echo
echo "Récupère les credentials ci-dessous et renseigne-les dans backend/.env :"
docker exec "$CONTAINER" /garage key info "$KEY_NAME" --show-secret
