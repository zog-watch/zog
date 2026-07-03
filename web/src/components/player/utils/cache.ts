import { conf } from "@/setup/config";

export interface CachedStream {
  url: string;
  contentType: string;
  size: number;
  cached: boolean;
}

function djb2(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  // unsigned
  return (h >>> 0).toString(36);
}

export function buildCacheKey(
  imdbId: string | undefined,
  streamUrl: string,
  extra?: string,
): string {
  const hash = djb2(`${streamUrl}|${extra ?? ""}`);
  const safe = (imdbId ?? "unknown").replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${safe}-${hash}`;
}

export async function requestCachedStream(
  cacheKey: string,
  sourceUrl: string,
  headers: Record<string, string>,
  signal?: AbortSignal,
  debrid?: { infoHash?: string; fileIdx?: number },
): Promise<CachedStream | null> {
  const base = conf().CACHE_URL;
  if (!base) return null;

  const url = new URL("/stream", base);
  url.searchParams.set("key", cacheKey);
  if (debrid?.infoHash) {
    url.searchParams.set("infoHash", debrid.infoHash);
    if (debrid.fileIdx !== undefined) {
      url.searchParams.set("fileIdx", String(debrid.fileIdx));
    }
  } else {
    url.searchParams.set("url", sourceUrl);
  }
  for (const [k, v] of Object.entries(headers)) {
    url.searchParams.set(`h_${k}`, v);
  }

  const res = await fetch(url.toString(), { method: "POST", signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`cache ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as CachedStream;
}
