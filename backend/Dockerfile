# Image de production du backend NestJS. Se construit depuis la racine du
# monorepo (contexte de build = racine) pour résoudre la dépendance
# workspace @muscleup/shared :
#   docker build -f backend/Dockerfile -t muscleup-api .

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# --- Dépendances (couche mise en cache tant que les lockfiles ne changent pas) ---
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/config/package.json packages/config/
COPY backend/package.json backend/
RUN pnpm install --frozen-lockfile

# --- Build ---
# Le client Prisma généré vit dans le store pnpm centralisé
# (node_modules/.pnpm/@prisma+client@*), pas dans backend/node_modules/.prisma
# avec le hoisting pnpm — on part donc de ce stage (deps complètes + build +
# client généré) pour l'image finale plutôt que de recréer un stage "prod only"
# qui devrait régénérer le client Prisma sans le CLI (devDependency).
FROM deps AS build
COPY packages/shared packages/shared
COPY backend backend
RUN pnpm --filter @muscleup/shared build
RUN cd backend && npx prisma generate --schema=./prisma/schema.prisma
RUN pnpm --filter @muscleup/api build
# Note : pas de `pnpm prune --prod` ici — dans ce monorepo pnpm, l'élagage a
# cassé le symlink node_modules/zod (dépendance de @muscleup/shared) en le
# jugeant à tort inutilisé depuis la racine, ce qui plante le serveur au
# démarrage (ERR_MODULE_NOT_FOUND). L'image finale garde donc les
# devDependencies ; au prix de quelques Mo, c'est fiable.

# --- Image finale ---
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup -g 1001 nodejs && adduser -D -u 1001 -G nodejs nestjs

COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=build --chown=nestjs:nodejs /app/packages/shared/package.json ./packages/shared/package.json
# pnpm ne hisse pas les dépendances d'un workspace enfant vers la racine : le
# symlink réel vers zod (dépendance de @muscleup/shared) vit ici, pas dans
# /app/node_modules — sans cette couche, le serveur plante au démarrage
# (ERR_MODULE_NOT_FOUND) dès que packages/shared/dist/policy.js importe zod.
COPY --from=build --chown=nestjs:nodejs /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=build --chown=nestjs:nodejs /app/backend/node_modules ./backend/node_modules
COPY --from=build --chown=nestjs:nodejs /app/backend/dist ./backend/dist
COPY --from=build --chown=nestjs:nodejs /app/backend/package.json ./backend/package.json
COPY --from=build --chown=nestjs:nodejs /app/backend/prisma ./backend/prisma
COPY --from=build --chown=nestjs:nodejs /app/backend/docker-entrypoint.sh ./backend/docker-entrypoint.sh
RUN chmod +x /app/backend/docker-entrypoint.sh

USER nestjs
WORKDIR /app/backend
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
