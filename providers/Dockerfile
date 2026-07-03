# Zog Providers
# Build-only image for @zog/providers
# Build context: monorepo root
FROM node:20-alpine AS build
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

COPY package.json pnpm-lock.yaml* ./
COPY providers/pnpm-workspace.docker.yaml ./pnpm-workspace.yaml
COPY providers/package.json ./providers/package.json
COPY web/package.json ./web/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --ignore-scripts

COPY providers ./providers
RUN pnpm --filter @zog/providers build

# The built artifacts live in /app/providers/lib
FROM node:20-alpine AS export
WORKDIR /app
COPY --from=build /app/providers/lib ./lib
COPY --from=build /app/providers/package.json ./package.json
