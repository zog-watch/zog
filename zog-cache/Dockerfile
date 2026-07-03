# Zog Cache
# Debrid -> S3 -> signed-URL streaming cache (Nitro)
# Build context: monorepo root
FROM node:20-alpine AS base
WORKDIR /app

# Enable pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ------------------------------------------------------------------------------
# Install workspace dependencies
# ------------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
COPY zog-cache/pnpm-workspace.docker.yaml ./pnpm-workspace.yaml
COPY zog-cache/package.json ./zog-cache/package.json
RUN apk add --no-cache python3 make g++ \
    && pnpm install --frozen-lockfile --ignore-scripts

# ------------------------------------------------------------------------------
# Build the cache service
# ------------------------------------------------------------------------------
FROM deps AS build
COPY zog-cache ./zog-cache
RUN pnpm --filter zog-cache build

# ------------------------------------------------------------------------------
# Production image
# ------------------------------------------------------------------------------
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
COPY --from=build /app/zog-cache/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
