import { searchIndexer } from "@/utils/indexer";
import { ensureTorrentIdByHash, getDownloadUrl, getTorrentFiles, pickVideoFile } from "@/utils/torbox";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") ?? "";
  if (!id.startsWith("tt")) {
    throw createError({ statusCode: 400, statusMessage: "Invalid id" });
  }
  const cfg = useRuntimeConfig();
  if (!cfg.debirdToken) {
    throw createError({ statusCode: 500, statusMessage: "DEBRID_TOKEN not set" });
  }
  const base = cfg.publicBase;
  if (!base) {
    throw createError({ statusCode: 500, statusMessage: "ADDON_PUBLIC_URL not set" });
  }

  const streams = await searchIndexer("movie", id, cfg.debirdToken).catch((err) => {
    console.error(`[stream/movie] indexer error for ${id}:`, err);
    return [];
  });
  // dedupe by infoHash
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const s of streams) {
    if (!s.infoHash || seen.has(s.infoHash)) continue;
    seen.add(s.infoHash);
    // build a self-hosted playback URL (slate replacement) bound to Railway's IP
    // plus a TorBox download URL as a fallback the cache can use
    const playback = `${base}/playback/${encodeURIComponent(s.infoHash)}/${s.fileIdx ?? 0}`;
    out.push({
      name: "Zog Net",
      title: s.title,
      infoHash: s.infoHash,
      fileIdx: s.fileIdx,
      url: `${base}/playback/${encodeURIComponent(s.infoHash)}/${s.fileIdx ?? 0}`,
      behaviorHints: s.behaviorHints ?? { bingeGroup: `zog-${s.infoHash}` },
      sources: s.sources,
    });
  }
  setResponseHeader(event, "Cache-Control", "public, max-age=300");
  return { streams: out };
});
