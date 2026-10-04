#!/bin/sh
# Applique les migrations Prisma avant de démarrer l'API (section 14.1 :
# "Migrations exécutées à chaque déploiement").
set -e

echo "Applying database migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "Starting API..."
exec node dist/main.js
