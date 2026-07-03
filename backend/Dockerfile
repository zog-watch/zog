# Zog Backend
# Nitro + Prisma + PostgreSQL
# Build context: monorepo root
FROM node:22-alpine AS base
WORKDIR /app

RUN apk add --no-cache curl openssl

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
COPY backend/pnpm-workspace.docker.yaml ./pnpm-workspace.yaml
COPY backend/package.json ./backend/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS build
COPY backend ./backend

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

RUN pnpm --filter zog-backend prepare
RUN pnpm --filter zog-backend db:generate
RUN pnpm --filter zog-backend build

FROM base AS production
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0

COPY --from=build /app/backend/.output ./.output
COPY --from=build /app/backend/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/backend/prisma ./prisma
COPY --from=build /app/backend/generated ./generated
COPY backend/start.sh ./start.sh

# Local prisma CLI for migrations (npm global install crashes on alpine)
RUN printf '%s\n' '{"private":true,"dependencies":{"prisma":"7.0.1"}}' > package.json \
  && pnpm install --ignore-scripts \
  && chmod +x ./start.sh

ENV PATH="/app/node_modules/.bin:$PATH"

EXPOSE 3000

CMD ["./start.sh"]
