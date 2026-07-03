import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = process.env.CACHE_DATA_DIR ?? "/tmp/zog-cache";
mkdirSync(DATA_DIR, { recursive: true });
const INDEX_PATH = join(DATA_DIR, "index.json");

export interface CacheRow {
  key: string;
  object_key: string;
  content_type: string;
  size_bytes: number;
  created_at: number;
  last_accessed_at: number;
  status: "ready" | "pending" | "failed";
  error: string | null;
}

type Index = Record<string, CacheRow>;

let cache: Index | null = null;

function load(): Index {
  if (cache) return cache;
  if (!existsSync(INDEX_PATH)) {
    cache = {};
    return cache;
  }
  try {
    const raw = readFileSync(INDEX_PATH, "utf-8");
    cache = JSON.parse(raw) as Index;
  } catch (err) {
    console.error("[zog-cache] failed to read index, starting fresh:", err);
    cache = {};
  }
  return cache!;
}

function persist() {
  if (!cache) return;
  // atomic write: tmp + rename
  const tmp = `${INDEX_PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify(cache, null, 2));
  // rename is atomic on POSIX
  renameSync(tmp, INDEX_PATH);
}

// Single in-process mutex to keep the index consistent across concurrent
// requests. Nitro runs single-threaded per worker, so a simple flag suffices.
let locked = false;
async function withLock<T>(fn: () => T | Promise<T>): Promise<T> {
  while (locked) {
    await new Promise((r) => setTimeout(r, 5));
  }
  locked = true;
  try {
    return await fn();
  } finally {
    locked = false;
  }
}

export function getEntry(key: string): CacheRow | undefined {
  return load()[key];
}

export function upsertEntry(row: CacheRow) {
  withLock(() => {
    const idx = load();
    idx[row.key] = row;
    persist();
  });
}

export function touchEntry(key: string, ts: number) {
  withLock(() => {
    const idx = load();
    const row = idx[key];
    if (row) {
      row.last_accessed_at = ts;
      persist();
    }
  });
}

export function deleteEntry(key: string) {
  withLock(() => {
    const idx = load();
    delete idx[key];
    persist();
  });
}

export function listAll(): CacheRow[] {
  return Object.values(load());
}

export function listByOldestAccess(): CacheRow[] {
  return listAll()
    .filter((r) => r.status === "ready")
    .sort((a, b) => a.last_accessed_at - b.last_accessed_at);
}

export function listExpired(now: number, ttlMs: number): CacheRow[] {
  return listAll().filter(
    (r) => r.status === "ready" && now - r.created_at > ttlMs,
  );
}
