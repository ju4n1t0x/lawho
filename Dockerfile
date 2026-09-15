# syntax=docker/dockerfile:1

###############################################################################
# Stage 1 — build: instala dependencias y genera el bundle de producción
###############################################################################
FROM node:22-bookworm-slim AS builder

# pnpm pinned desde package.json (packageManager)
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

WORKDIR /app

# Primero solo lockfiles para cachear capas de dependencias
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Después el código fuente (node_modules/dist/upload/.env quedan fuera vía .dockerignore)
COPY . .

# Build de Astro con el adaptador Node standalone
# El prerender de páginas estáticas valida las variables del env.schema aunque
# validateSecrets=false; se proveen placeholders públicos SOLO para el build
# (los valores reales los inyecta docker-compose en el container de runtime).
ENV DATABASE_HOST=build-placeholder \
    DATABASE_PORT=5432 \
    DATABASE_USER=build-placeholder \
    DATABASE_PASSWORD=build-placeholder \
    DATABASE_NAME=build-placeholder \
    DATABASE_SSL=false
RUN pnpm astro build

###############################################################################
# Stage 2 — runtime: imagen mínima con el servidor compilado
###############################################################################
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

# Dependencias de producción únicamente (argon2/sharp prebuilds para glibc)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile && pnpm prune --prod

# Bundle compilado desde el stage builder
COPY --from=builder /app/dist ./dist

# Directorio de uploads: se monta como volumen en compose; debe ser escribible
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads /app/dist

# Ejecutar como usuario no root
USER node

EXPOSE 4321

# Verifica que el servidor responda
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 4321) + '/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Entry point del adaptador standalone de @astrojs/node
CMD ["node", "./dist/server/entry.mjs"]