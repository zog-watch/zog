# Zog Proxy
# CORS / M3U8 / TS proxy built with Nitro
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
COPY proxy/pnpm-workspace.docker.yaml ./pnpm-workspace.yaml
COPY proxy/package.json ./proxy/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts

# ------------------------------------------------------------------------------
# Build the proxy
# ------------------------------------------------------------------------------
FROM deps AS build
COPY proxy ./proxy
RUN pnpm --filter zog-proxy build

# ------------------------------------------------------------------------------
# Production image
# ------------------------------------------------------------------------------
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
COPY --from=build /app/proxy/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
