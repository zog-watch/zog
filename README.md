# Zog

Zog is a free, open-source streaming platform. This monorepo contains everything
needed to self-host the full stack on [Railway](https://railway.app) or locally
with Docker.

- **Live site:** https://zog.watch
- **Docs:** https://zog.watch/docs
- **GitHub:** https://github.com/zog-watch/zog

## What's inside

| Directory | Service | Description |
|-----------|---------|-------------|
| `web` | Frontend | React + Vite streaming UI |
| `backend` | API | Nitro + Prisma + PostgreSQL backend |
| `proxy` | Proxy | CORS / M3U8 / TS proxy |
| `providers` | Package | `@zog/providers` scraper/provider library |
| `extension` | Browser ext | Plasmo extension (Chrome / Firefox) |
| `desktop` | Desktop app | Electron wrapper |
| `userscript` | Userscript | Violentmonkey/Tampermonkey fallback |
| `docs` | Docs | Astro Starlight documentation |

## Quick deploy to Railway

1. Fork / push this repo to your own GitHub account.
2. Click **Deploy on Railway** below (or import the repo manually).
3. Create a **PostgreSQL** service in Railway and link it to `zog-backend`.
4. Set the required environment variables on each service (see `.env.example`).
5. Railway will build and deploy `web`, `backend`, `proxy`, and `docs` automatically.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/zog)

### Required variables

- `VITE_TMDB_READ_API_KEY` / `TMDB_API_KEY` — Get from [TMDB](https://www.themoviedb.org/settings/api)
- `CRYPTO_SECRET` — Generate with `openssl rand -base64 32`
- `DATABASE_URL` — Auto-filled when you link a Railway Postgres service
- `VITE_BACKEND_URL` — Public URL of the `zog-backend` service
- `VITE_CORS_PROXY_URL` / `VITE_M3U8_PROXY_URL` — Public URL of the `zog-proxy` service
- `VITE_APP_DOMAIN` — Public URL of the `zog-web` service

See `.env.example` for the full list.

## Local development

```bash
# Install dependencies
pnpm install

# Start infrastructure (Postgres)
docker compose up -d postgres

# Copy environment file
cp .env.example .env
# Edit .env and add your TMDB_API_KEY + CRYPTO_SECRET

# Run backend migrations
cd backend && pnpm prisma migrate deploy

# Start services (in separate terminals)
pnpm dev:backend
pnpm dev:proxy
pnpm dev:web
pnpm dev:docs
```

## Building locally

```bash
# Build everything
pnpm build:providers
pnpm build:web
pnpm build:backend
pnpm build:proxy
pnpm build:docs
```

## Docker Compose

```bash
cp .env.example .env
# Edit .env with your keys

docker compose up --build
```

This starts Postgres, backend, proxy, web, and docs.

## License

MIT
