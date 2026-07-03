import {
  defineRailway,
  github,
  postgres,
  project,
  service,
  volume,
} from "railway/iac";

const fn = defineRailway(() => {
  const pgData = volume("postgres-volume", {
    region: "europe-west4-drams3a",
    sizeMB: 5000,
  });

  const db = postgres("Postgres", {
    volumeMounts: { "/var/lib/postgresql/data": pgData },
  });

  const githubSource = github("zog-watch/zog", {
    rootDirectory: ".",
    branch: "main",
  });

  const backend = service("zog-backend", {
    source: githubSource,
    build: { builder: "DOCKERFILE", dockerfilePath: "backend/Dockerfile" },
    startCommand:
      "sh -c 'pnpm prisma migrate deploy && node .output/server/index.mjs'",
    healthcheck: "/healthcheck",
    env: {
      DATABASE_URL: db.env.DATABASE_URL,
      CRYPTO_SECRET: "REPLACE_ME_RUN_openssl_rand_base64_32",
      TMDB_API_KEY: "REPLACE_ME_TMDB_API_KEY",
      META_NAME: "Zog Backend",
      META_DESCRIPTION: "Zog API backend",
      CAPTCHA: "false",
    },
  });

  const proxy = service("zog-proxy", {
    source: githubSource,
    build: { builder: "DOCKERFILE", dockerfilePath: "proxy/Dockerfile" },
    startCommand: "node .output/server/index.mjs",
    healthcheck: "/",
  });

  const web = service("zog-web", {
    source: githubSource,
    build: { builder: "DOCKERFILE", dockerfilePath: "web/Dockerfile" },
    startCommand: "nginx -g 'daemon off;'",
    healthcheck: "/",
    env: {
      VITE_TMDB_READ_API_KEY: "REPLACE_ME_TMDB_API_KEY",
      VITE_APP_DOMAIN: "https://zog.watch",
      VITE_BACKEND_URL: backend.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${backend.env.RAILWAY_PUBLIC_DOMAIN}`
        : "http://localhost:3000",
      VITE_CORS_PROXY_URL: proxy.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${proxy.env.RAILWAY_PUBLIC_DOMAIN}`
        : "http://localhost:3001",
      VITE_M3U8_PROXY_URL: proxy.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${proxy.env.RAILWAY_PUBLIC_DOMAIN}`
        : "http://localhost:3001",
      VITE_DMCA_EMAIL: "dmca@zog.watch",
      VITE_NORMAL_ROUTER: "true",
      VITE_PWA_ENABLED: "true",
      VITE_HAS_ONBOARDING: "true",
      VITE_ALLOW_AUTOPLAY: "false",
    },
  });

  const docs = service("zog-docs", {
    source: githubSource,
    build: { builder: "DOCKERFILE", dockerfilePath: "docs/Dockerfile" },
    startCommand: "nginx -g 'daemon off;'",
    healthcheck: "/",
    env: {
      SITE_URL: "https://zog.watch",
      BASE_PATH: "/docs",
    },
  });

  return project("zog", {
    resources: [pgData, db, web, backend, proxy, docs],
  });
});

export default fn;
