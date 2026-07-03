# Zog Docs
# Astro Starlight documentation site
# Build context: monorepo root
FROM node:20-alpine AS builder
WORKDIR /app

# Enable pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install workspace dependencies
COPY package.json pnpm-lock.yaml* ./
COPY docs/pnpm-workspace.docker.yaml ./pnpm-workspace.yaml
COPY docs/package.json ./docs/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --ignore-scripts

# Copy source
COPY docs ./docs

# Build-time configuration (override via docker-compose build.args or --build-arg)
ARG SITE_URL=https://zog.watch
ARG BASE_PATH=/docs
ENV SITE_URL=${SITE_URL}
ENV BASE_PATH=${BASE_PATH}

# Build the site
RUN pnpm --filter zog-docs build

# Stage 2: Serve
FROM nginx:alpine-slim AS runtime
COPY --from=builder /app/docs/dist /usr/share/nginx/html
COPY docs/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
