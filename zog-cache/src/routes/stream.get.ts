import { getCachedUrl } from "@/utils/cache";

export default defineEventHandler(async (event) => {
  const key = String(getQuery(event).key ?? "").trim();
  if (!key) {
    throw createError({ statusCode: 400, statusMessage: "Missing key" });
  }
  const result = await getCachedUrl(key);
  if (!result) {
    throw createError({ statusCode: 404, statusMessage: "Not cached" });
  }
  return result;
});
