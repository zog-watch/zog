# Zog Docs

Documentation site for Zog, built with [Astro](https://astro.build) and [Starlight](https://starlight.astro.build).

## Development

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
```

## Docker

Build and run with Docker:

```bash
docker build -t zog-docs .
docker run -p 8080:8080 zog-docs
```

Or use Docker Compose:

```bash
docker compose up
```

The container image is also available at [ghcr.io/zog-watch/zog-docs](https://ghcr.io/zog-watch/zog-docs).

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SITE_URL` | `https://zog.watch` | The base site URL for the build |
| `BASE_PATH` | `/docs` | The base path for the site |
| `PORT` | `8080` | Port for the Docker container |
