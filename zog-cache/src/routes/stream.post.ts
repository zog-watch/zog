import { downloadAndCache, getCachedUrl } from "@/utils/cache";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const key = String(query.key ?? "").trim();
  const url = String(query.url ?? "").trim();
  const infoHash = String(query.infoHash ?? "").trim();
  const fileIdxRaw = query.fileIdx;
  const fileIdx =
    fileIdxRaw === undefined || fileIdxRaw === ""
      ? undefined
      : Number.parseInt(String(fileIdxRaw), 10);

  if (!key) {
    throw createError({ statusCode: 400, statusMessage: "Missing key" });
  }
  if (!infoHash && !url) {
    throw createError({ statusCode: 400, statusMessage: "Missing url or infoHash" });
  }
  if (fileIdx !== undefined && Number.isNaN(fileIdx)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid fileIdx" });
  }

  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    if (k.startsWith("h_") && typeof v === "string") {
      headers[k.slice(2)] = v;
    }
  }

  const cached = await getCachedUrl(key).catch((err) => {
    console.error("Cache lookup error:", err);
    return null;
  });
  if (cached) return cached;

  const result = await downloadAndCache({
    cacheKey: key,
    fallbackUrl: url || undefined,
    infoHash: infoHash || undefined,
    fileIdx,
    headers,
  });
  return result;
});
