import { createHash } from "node:crypto";

import {
  getEntry,
  listAll,
  listByOldestAccess,
  listExpired,
  touchEntry,
  upsertEntry,
  type CacheRow,
} from "./db";
import {
  deleteObject,
  getSignedDownloadUrl,
  headObject,
  putObject,
} from "./s3";

const DOWNLOAD_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024 * 1024; // 50GB hard cap per file

function sanitizeKey(raw: string): string {
  if (!/^[a-zA-Z0-9._-]{1,128}$/.test(raw)) {
    throw new Error("Invalid cache key");
  }
  return raw;
}

function objectKeyFor(cacheKey: string): string {
  return `cache/${cacheKey}.bin`;
}

export interface FetchResult {
  status: "ready";
  url: string;
  contentType: string;
  size: number;
  cached: true;
}

export interface PendingResult {
  status: "pending";
  message: string;
}

export async function getCachedUrl(cacheKey: string): Promise<FetchResult | null> {
  const key = sanitizeKey(cacheKey);
  const entry = getEntry(key);
  if (!entry || entry.status !== "ready") return null;

  // touch for LRU
  touchEntry(key, Date.now());

  // verify still in bucket
  const head = await headObject(entry.object_key).catch(() => null);
  if (!head) {
    upsertEntry({ ...entry, status: "failed", error: "missing in bucket" });
    return null;
  }

  const url = await getSignedDownloadUrl(entry.object_key);
  return {
    status: "ready",
    url,
    contentType: entry.content_type,
    size: entry.size_bytes,
    cached: true,
  };
}

export async function downloadAndCache(
  cacheKey: string,
  sourceUrl: string,
  extraHeaders: Record<string, string> = {},
): Promise<FetchResult> {
  const key = sanitizeKey(cacheKey);
  const objectKey = objectKeyFor(key);

  const existing = await getCachedUrl(key);
  if (existing) return existing;

  const now = Date.now();
  upsertEntry({
    key,
    object_key: objectKey,
    content_type: "application/octet-stream",
    size_bytes: 0,
    created_at: now,
    last_accessed_at: now,
    status: "pending",
    error: null,
  });

  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
    ...extraHeaders,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    const res = await fetch(sourceUrl, { headers, signal: controller.signal, redirect: "follow" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Upstream returned ${res.status}: ${text.slice(0, 200)}`);
    }

    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    const contentLength = Number(res.headers.get("content-length") ?? "0");
    if (contentLength && contentLength > MAX_DOWNLOAD_BYTES) {
      throw new Error(`File too large: ${contentLength} bytes`);
    }

    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > MAX_DOWNLOAD_BYTES) {
      throw new Error(`File too large: ${buf.byteLength} bytes`);
    }

    await putObject(objectKey, buf, contentType);

    const finishedAt = Date.now();
    upsertEntry({
      key,
      object_key: objectKey,
      content_type: contentType,
      size_bytes: buf.byteLength,
      created_at: now,
      last_accessed_at: finishedAt,
      status: "ready",
      error: null,
    });

    // Enforce size cap
    await enforceSizeCap();

    const url = await getSignedDownloadUrl(objectKey);
    return {
      status: "ready",
      url,
      contentType,
      size: buf.byteLength,
      cached: false,
    };
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    upsertEntry({
      key,
      object_key: objectKey,
      content_type: "application/octet-stream",
      size_bytes: 0,
      created_at: now,
      last_accessed_at: now,
      status: "failed",
      error: msg,
    });
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function enforceSizeCap() {
  const cfg = useRuntimeConfig().cache;
  const rows = listAll();
  let total = 0;
  for (const r of rows) {
    if (r.status === "ready") total += r.size_bytes;
  }
  if (total <= cfg.maxBytes) return;

  const ordered = listByOldestAccess();
  for (const row of ordered) {
    if (total <= cfg.maxBytes) break;
    try {
      await deleteObject(row.object_key);
    } catch (err) {
      console.error(`Failed to delete object ${row.object_key}:`, err);
    }
    upsertEntry({ ...row, status: "failed", error: "evicted by size cap", size_bytes: 0 });
    total -= row.size_bytes;
    console.log(`Evicted ${row.key} (${row.size_bytes} bytes), total now ${total}`);
  }
}

export async function runCleanup(): Promise<{ evicted: number; expired: number; totalBefore: number; totalAfter: number }> {
  const cfg = useRuntimeConfig().cache;
  const before = listAll().reduce((s, r) => (r.status === "ready" ? s + r.size_bytes : s), 0);

  let expired = 0;
  for (const row of listExpired(Date.now(), cfg.ttlMs)) {
    try {
      await deleteObject(row.object_key);
    } catch (err) {
      console.error(`Failed to delete expired object ${row.object_key}:`, err);
    }
    upsertEntry({ ...row, status: "failed", error: "expired by TTL", size_bytes: 0 });
    expired++;
  }

  const ordered = listByOldestAccess();
  let total = listAll().reduce((s, r) => (r.status === "ready" ? s + r.size_bytes : s), 0);
  let evicted = 0;
  for (const row of ordered) {
    if (total <= cfg.maxBytes) break;
    try {
      await deleteObject(row.object_key);
    } catch (err) {
      console.error(`Failed to delete evicted object ${row.object_key}:`, err);
    }
    upsertEntry({ ...row, status: "failed", error: "evicted by size cap", size_bytes: 0 });
    total -= row.size_bytes;
    evicted++;
  }

  return {
    evicted,
    expired,
    totalBefore: before,
    totalAfter: total,
  };
}
