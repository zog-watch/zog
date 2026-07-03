import { runCleanup } from "@/utils/cache";
import { listAll } from "@/utils/db";

export default defineEventHandler(async (event) => {
  const method = event.method;
  if (method === "GET") {
    const rows = listAll();
    const total = rows.reduce((s, r) => (r.status === "ready" ? s + r.size_bytes : s), 0);
    return {
      entries: rows.length,
      totalBytes: total,
      rows,
    };
  }
  if (method === "POST") {
    const result = await runCleanup();
    return { ok: true, ...result };
  }
  throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
});
