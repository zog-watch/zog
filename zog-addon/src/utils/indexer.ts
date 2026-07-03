export interface IndexerStream {
  title: string;
  infoHash: string;
  fileIdx: number;
  behaviorHints?: { bingeGroup?: string; filename?: string; videoSize?: number };
  sources?: string[];
}

export interface IndexerResponse {
  streams: IndexerStream[];
}

const BASE = "https://torrentio.strem.fun";

export async function searchIndexer(
  type: "movie" | "series",
  id: string,
  debridToken: string,
): Promise<IndexerStream[]> {
  const config = {
    maxResultsPerResolution: 0,
    maxSize: 0,
    cachedOnly: false,
    removeTrash: true,
    resultFormat: ["all"],
    debridService: "torbox",
    debridApiKey: debridToken,
    debridStreamProxyPassword: "",
    languages: { exclude: [], preferred: ["en"] },
    resolutions: { "4k": true, "1080p": true, "720p": true, "480p": true },
    options: {
      remove_ranks_under: -10000000000,
      allow_english_in_languages: false,
      remove_unknown_languages: false,
    },
  };
  // URL-safe base64 (no padding) without relying on Node Buffer
  const json = JSON.stringify(config);
  const b64 =
    typeof btoa !== "undefined"
      ? btoa(json).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_")
      : Buffer.from(json).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const url = `${BASE}/${b64}/stream/${type}/${id}.json`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (zognet addon)" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`indexer ${res.status} url=${url.slice(0, 100)}... body=${body.slice(0, 200)}`);
  }
  const jsonRes = (await res.json()) as IndexerResponse;
  console.log(`[indexer] ${id} returned ${jsonRes.streams?.length ?? 0} streams (raw keys: ${Object.keys(jsonRes).join(",")}, first: ${JSON.stringify(jsonRes.streams?.[0] ?? jsonRes).slice(0, 200)})`);
  return jsonRes.streams ?? [];
}
