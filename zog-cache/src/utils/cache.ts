import { Upload } from "@aws-sdk/lib-storage";

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
  getS3Client,
  getBucket,
  headObject,
} from "./s3";
import {
  ensureTorrentIdByHash,
  getDownloadUrl,
  getTorrentFileList,
} from "./torbox";

const DOWNLOAD_TIMEOUT_MS = 30 * 60 * 1000;
// hard cap per file: 100GB (cache total cap is 200GB, so any single file
// can be at most half the budget)
const MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024 * 1024;
// 5GB is the threshold above which PutObject with a body stream fails and
// we have to use multipart upload
const MULTIPART_THRESHOLD = 5 * 1024 * 1024 * 1024;

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
  cached: boolean;
}

export interface PendingResult {
  status: "pending";
  message: string;
}

export async function getCachedUrl(cacheKey: string): Promise<FetchResult | null> {
  const key = sanitizeKey(cacheKey);
  const entry = getEntry(key);
  if (!entry || entry.status !== "ready") return null;

  touchEntry(key, Date.now());

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

export interface CacheRequest {
  cacheKey: string;
  fallbackUrl?: string;
  headers?: Record<string, string>;
  // self-hosted: when present, use TorBox API instead of the URL
  infoHash?: string;
  fileIdx?: number;
}

async function resolveSourceUrl(req: CacheRequest): Promise<string> {
  if (req.infoHash) {
    const torrentId = await ensureTorrentIdByHash(req.infoHash);
    let fileId = req.fileIdx;
    if (fileId === undefined) {
      const files = await getTorrentFileList(torrentId);
      const video = files.find(
        (f) => f.mimetype?.startsWith("video/") ?? /\.(mp4|mkv|webm|mov)$/i.test(f.name),
      );
      if (!video) throw new Error("no video file in torrent");
      fileId = video.id;
    }
    return getDownloadUrl(torrentId, fileId);
  }
  if (!req.fallbackUrl) {
    throw new Error("no infoHash and no fallbackUrl");
  }
  return req.fallbackUrl;
}

export async function downloadAndCache(req: CacheRequest): Promise<FetchResult> {
  const key = sanitizeKey(req.cacheKey);
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

  let sourceUrl: string;
  try {
    sourceUrl = await resolveSourceUrl(req);
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
  }

  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
    ...(req.headers ?? {}),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    const res = await fetch(sourceUrl, {
      headers,
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Upstream returned ${res.status}: ${text.slice(0, 200)}`);
    }

    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    const contentLength = Number(res.headers.get("content-length") ?? "0");
    if (contentLength && contentLength > MAX_DOWNLOAD_BYTES) {
      throw new Error(`File too large: ${contentLength} bytes`);
    }

    // Track bytes as we consume the upstream body
    const body = res.body;
    if (!body) {
      throw new Error("Upstream returned no body");
    }
    let bytes = 0;
    const countingBody = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = body.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              bytes += value.byteLength;
              if (bytes > MAX_DOWNLOAD_BYTES) {
                try { controller.error(new Error(`File too large (>${MAX_DOWNLOAD_BYTES})`)); } catch {}
                try { reader.cancel(); } catch {}
                return;
              }
              controller.enqueue(value);
            }
          }
          controller.close();
        } catch (err) {
          try { controller.error(err); } catch {}
        }
      },
      cancel() {
        try { body.cancel(); } catch {}
      },
    });

    // Stream directly to S3 — no buffering of the whole file in memory
    const client = getS3Client();
    const bucket = getBucket();
    const upload = new Upload({
      client,
      params: {
        Bucket: bucket,
        Key: objectKey,
        Body: countingBody,
        ContentType: contentType,
      },
      queueSize: 4,
      partSize: 16 * 1024 * 1024,
      leavePartsOnError: false,
    });
    await upload.done();

    const finishedAt = Date.now();
    upsertEntry({
      key,
      object_key: objectKey,
      content_type: contentType,
      size_bytes: bytes,
      created_at: now,
      last_accessed_at: finishedAt,
      status: "ready",
      error: null,
    });

    await enforceSizeCap();

    const url = await getSignedDownloadUrl(objectKey);
    return {
      status: "ready",
      url,
      contentType,
      size: bytes,
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
