import { downloadAndCache, getCachedUrl } from "@/utils/cache";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const key = String(query.key ?? "").trim();
  const url = String(query.url ?? "").trim();

  if (!key) {
    throw createError({ statusCode: 400, statusMessage: "Missing key" });
  }
  if (!url) {
    throw createError({ statusCode: 400, statusMessage: "Missing url" });
  }

  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    if (k.startsWith("h_") && typeof v === "string") {
      headers[k.slice(2)] = v;
    }
  }

  // cache hit
  const cached = await getCachedUrl(key).catch((err) => {
    console.error("Cache lookup error:", err);
    return null;
  });
  if (cached) return cached;

  // download + cache
  const result = await downloadAndCache(key, url, headers);
  return result;
});
