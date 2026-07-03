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
  const encoded = Buffer.from(JSON.stringify(config))
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const url = `${BASE}/${encoded}/stream/${type}/${id}.json`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (zognet addon)" },
  });
  if (!res.ok) {
    throw new Error(`indexer ${res.status}`);
  }
  const json = (await res.json()) as IndexerResponse;
  return json.streams ?? [];
}
