# Zog Backend
# Nitro + Prisma + PostgreSQL
# Build context: monorepo root
FROM node:22-alpine AS base
WORKDIR /app

# Install curl for healthchecks and openssl for Prisma
RUN apk add --no-cache curl openssl

# Enable pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ------------------------------------------------------------------------------
# Install workspace dependencies
# ------------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
COPY backend/pnpm-workspace.docker.yaml ./pnpm-workspace.yaml
COPY backend/package.json ./backend/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --ignore-scripts

# ------------------------------------------------------------------------------
# Build the app
# ------------------------------------------------------------------------------
FROM deps AS build
COPY backend ./backend

# Build-time arguments (used by nitro.config.ts / prisma)
ARG DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public
ARG META_NAME=Zog Backend
ARG META_DESCRIPTION="Zog API backend"
ARG CRYPTO_SECRET=
ARG TMDB_API_KEY=
ARG CAPTCHA=false
ARG CAPTCHA_CLIENT_KEY=
ARG TRAKT_CLIENT_ID=
ARG TRAKT_SECRET_ID=

ENV DATABASE_URL=${DATABASE_URL}
ENV META_NAME=${META_NAME}
ENV META_DESCRIPTION=${META_DESCRIPTION}
ENV CRYPTO_SECRET=${CRYPTO_SECRET}
ENV TMDB_API_KEY=${TMDB_API_KEY}
ENV CAPTCHA=${CAPTCHA}
ENV CAPTCHA_CLIENT_KEY=${CAPTCHA_CLIENT_KEY}
ENV TRAKT_CLIENT_ID=${TRAKT_CLIENT_ID}
ENV TRAKT_SECRET_ID=${TRAKT_SECRET_ID}

RUN pnpm --filter zog-backend db:generate
RUN pnpm --filter zog-backend build

# ------------------------------------------------------------------------------
# Production image
# ------------------------------------------------------------------------------
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/backend/.output ./.output
COPY --from=build /app/backend/package.json ./package.json
COPY --from=build /app/backend/prisma ./prisma
COPY --from=build /app/backend/generated ./generated
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3000

# Run migrations then start the server.
# The real DATABASE_URL is injected at runtime by Railway / docker-compose.
CMD ["sh", "-c", "pnpm prisma migrate deploy && node .output/server/index.mjs"]
