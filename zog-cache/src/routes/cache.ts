import { runCleanup } from "@/utils/cache";
import { deleteEntry, getEntry, listAll } from "@/utils/db";
import { deleteObject } from "@/utils/s3";

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
    const body = (await readBody(event)) as { key?: string; runCleanup?: boolean };
    if (body.runCleanup) {
      const result = await runCleanup();
      return { ok: true, ...result };
    }
    if (body.key) {
      const entry = getEntry(body.key);
      if (!entry) {
        throw createError({ statusCode: 404, statusMessage: "Entry not found" });
      }
      try {
        await deleteObject(entry.object_key);
      } catch (err) {
        console.error("Failed to delete object:", err);
      }
      deleteEntry(body.key);
      return { ok: true, deleted: body.key };
    }
    const result = await runCleanup();
    return { ok: true, ...result };
  }
  if (method === "DELETE") {
    const key = getQuery(event).key as string;
    if (!key) {
      throw createError({ statusCode: 400, statusMessage: "Missing key" });
    }
    const entry = getEntry(key);
    if (!entry) {
      throw createError({ statusCode: 404, statusMessage: "Entry not found" });
    }
    try {
      await deleteObject(entry.object_key);
    } catch (err) {
      console.error("Failed to delete object:", err);
    }
    deleteEntry(key);
    return { ok: true, deleted: key };
  }
  throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
});
