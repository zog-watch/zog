# Zog Web
# React + Vite frontend served with nginx
# Build context: monorepo root (so the local @zog/providers workspace package is available)
FROM node:20-alpine AS base
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ------------------------------------------------------------------------------
# Install workspace dependencies
# ------------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
COPY web/pnpm-workspace.docker.yaml ./pnpm-workspace.yaml
COPY web/package.json ./web/package.json
COPY providers/package.json ./providers/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts

# ------------------------------------------------------------------------------
# Build the web app
# ------------------------------------------------------------------------------
FROM deps AS build
COPY web ./web
COPY providers ./providers

ARG VITE_TMDB_READ_API_KEY
ARG VITE_APP_DOMAIN=https://zog.watch
ARG VITE_BACKEND_URL
ARG VITE_CORS_PROXY_URL
ARG VITE_M3U8_PROXY_URL
ARG VITE_DMCA_EMAIL=dmca@zog.watch
ARG VITE_NORMAL_ROUTER=true
ARG VITE_PWA_ENABLED=true
ARG VITE_OPENSEARCH_ENABLED=false
ARG VITE_HAS_ONBOARDING=true
ARG VITE_ALLOW_AUTOPLAY=false
ARG VITE_ONBOARDING_CHROME_EXTENSION_INSTALL_LINK
ARG VITE_ONBOARDING_PROXY_INSTALL_LINK
ARG VITE_DISALLOWED_IDS
ARG VITE_CDN_REPLACEMENTS

ENV VITE_TMDB_READ_API_KEY=${VITE_TMDB_READ_API_KEY}
ENV VITE_APP_DOMAIN=${VITE_APP_DOMAIN}
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
ENV VITE_CORS_PROXY_URL=${VITE_CORS_PROXY_URL}
ENV VITE_M3U8_PROXY_URL=${VITE_M3U8_PROXY_URL}
ENV VITE_DMCA_EMAIL=${VITE_DMCA_EMAIL}
ENV VITE_NORMAL_ROUTER=${VITE_NORMAL_ROUTER}
ENV VITE_PWA_ENABLED=${VITE_PWA_ENABLED}
ENV VITE_OPENSEARCH_ENABLED=${VITE_OPENSEARCH_ENABLED}
ENV VITE_HAS_ONBOARDING=${VITE_HAS_ONBOARDING}
ENV VITE_ALLOW_AUTOPLAY=${VITE_ALLOW_AUTOPLAY}
ENV VITE_ONBOARDING_CHROME_EXTENSION_INSTALL_LINK=${VITE_ONBOARDING_CHROME_EXTENSION_INSTALL_LINK}
ENV VITE_ONBOARDING_PROXY_INSTALL_LINK=${VITE_ONBOARDING_PROXY_INSTALL_LINK}
ENV VITE_DISALLOWED_IDS=${VITE_DISALLOWED_IDS}
ENV VITE_CDN_REPLACEMENTS=${VITE_CDN_REPLACEMENTS}

# Build providers first, then the web app
RUN pnpm --filter @zog/providers build
RUN pnpm --filter zog-web build

# ------------------------------------------------------------------------------
# Production environment
# ------------------------------------------------------------------------------
FROM nginx:stable-alpine
COPY --from=build /app/web/dist /usr/share/nginx/html
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
# cache bust 1783086079
