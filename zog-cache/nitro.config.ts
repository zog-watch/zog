import { join } from "path";
import pkg from "./package.json";

export default defineNitroConfig({
  compatibilityDate: "2025-04-20",
  srcDir: "./src",
  runtimeConfig: {
    version: pkg.version,
    debirdToken: process.env.DEBRID_TOKEN ?? "",
    s3: {
      endpoint: process.env.AWS_ENDPOINT_URL ?? "",
      region: process.env.AWS_DEFAULT_REGION ?? "auto",
      bucket: process.env.AWS_S3_BUCKET_NAME ?? "",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    },
    cache: {
      maxBytes: Number(process.env.CACHE_MAX_BYTES ?? 200 * 1024 * 1024 * 1024),
      ttlMs: Number(process.env.CACHE_TTL_MS ?? 30 * 24 * 60 * 60 * 1000),
      cleanupIntervalMs: Number(
        process.env.CACHE_CLEANUP_INTERVAL_MS ?? 60 * 60 * 1000,
      ),
      signedUrlTtlSeconds: Number(
        process.env.CACHE_SIGNED_URL_TTL ?? 60 * 60 * 4,
      ),
    },
    databaseUrl: process.env.DATABASE_URL ?? "",
  },
  alias: {
    "@": join(__dirname, "src"),
  },
});
