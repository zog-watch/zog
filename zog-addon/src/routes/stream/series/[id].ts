import { searchIndexer } from "@/utils/indexer";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") ?? "";
  // series id is like tt1234567:1:5 (imdb:season:episode)
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

  const streams = await searchIndexer("series", id, cfg.debridToken);
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const s of streams) {
    if (!s.infoHash || seen.has(s.infoHash)) continue;
    seen.add(s.infoHash);
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
