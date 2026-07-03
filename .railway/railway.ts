import {
  defineRailway,
  postgres,
  preserve,
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

  const backend = service("zog-backend", {
    build: { builder: "DOCKERFILE", dockerfilePath: "backend/Dockerfile" },
    startCommand: "sh -c './node_modules/.bin/prisma migrate deploy && node .output/server/index.mjs'",
    healthcheck: "/healthcheck",
    env: {
      DATABASE_URL: db.env.DATABASE_URL,
      CRYPTO_SECRET: preserve(),
      TMDB_API_KEY: preserve(),
      META_NAME: "Zog Backend",
      META_DESCRIPTION: "Zog API backend",
      CAPTCHA: "false",
    },
  });

  const proxy = service("zog-proxy", {
    build: { builder: "DOCKERFILE", dockerfilePath: "proxy/Dockerfile" },
    startCommand: "node .output/server/index.mjs",
    healthcheck: "/",
    env: {
      UPSTREAM_PROXY: preserve(),
    },
  });

  const web = service("zog-web", {
    build: { builder: "DOCKERFILE", dockerfilePath: "web/Dockerfile" },
    startCommand: "nginx -g 'daemon off;'",
    healthcheck: "/health",
    env: {
      VITE_TMDB_READ_API_KEY: preserve(),
      VITE_APP_DOMAIN: "https://zog.watch",
      VITE_BACKEND_URL: "https://api.zog.watch",
      VITE_CORS_PROXY_URL: "https://proxy.zog.watch",
      VITE_M3U8_PROXY_URL: "https://proxy.zog.watch",
      VITE_DMCA_EMAIL: "dmca@zog.watch",
      VITE_NORMAL_ROUTER: "true",
      VITE_PWA_ENABLED: "true",
      VITE_HAS_ONBOARDING: "false",
      VITE_ALLOW_AUTOPLAY: "false",
    },
  });

  const docs = service("zog-docs", {
    build: { builder: "DOCKERFILE", dockerfilePath: "docs/Dockerfile" },
    startCommand: "nginx -g 'daemon off;'",
    healthcheck: "/",
    env: {
      SITE_URL: "https://docs.zog.watch",
      BASE_PATH: "/",
    },
  });

  return project("zog", {
    resources: [pgData, db, web, backend, proxy, docs],
  });
});

export default fn;
