import { ensureTorrentIdByHash, getDownloadUrl, getTorrentFiles, pickVideoFile } from "@/utils/torbox";

const PROXY_TIMEOUT_MS = 6 * 60 * 60 * 1000;

export default defineEventHandler(async (event) => {
  const infoHash = getRouterParam(event, "infoHash") ?? "";
  const fileIdxRaw = getRouterParam(event, "fileIdx") ?? "0";
  const fileIdx = Number.parseInt(fileIdxRaw, 10);
  if (!infoHash || !/^[a-fA-F0-9]{40}$/.test(infoHash)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid infoHash" });
  }
  if (Number.isNaN(fileIdx) || fileIdx < 0) {
    throw createError({ statusCode: 400, statusMessage: "Invalid fileIdx" });
  }

  const cfg = useRuntimeConfig();
  if (!cfg.debirdToken) {
    throw createError({ statusCode: 500, statusMessage: "DEBRID_TOKEN not set" });
  }

  const torrentId = await ensureTorrentIdByHash(infoHash);
  let fid = fileIdx;
  if (fid === 0) {
    const files = await getTorrentFiles(torrentId);
    const video = pickVideoFile(files);
    if (!video) throw createError({ statusCode: 404, statusMessage: "no video file" });
    fid = video.id;
  }
  const upstream = await getDownloadUrl(torrentId, fid);
  console.log(`[playback] ${infoHash}/${fid} -> ${upstream.slice(0, 80)}...`);

  // Range passthrough
  const range = getRequestHeader(event, "range");

  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
  };
  if (range) headers.Range = range;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
  setResponseHeader(event, "Access-Control-Allow-Origin", "*");
  setResponseHeader(event, "Access-Control-Allow-Headers", "Range");
  setResponseHeader(event, "Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length");

  try {
    const res = await fetch(upstream, { headers, signal: controller.signal });
    if (!res.ok && res.status !== 206) {
      throw createError({ statusCode: res.status, statusMessage: `torbox ${res.status}` });
    }
    setResponseStatus(event, res.status, res.statusText);
    const ct = res.headers.get("content-type");
    if (ct) setResponseHeader(event, "Content-Type", ct);
    const cl = res.headers.get("content-length");
    if (cl) setResponseHeader(event, "Content-Length", cl);
    const cr = res.headers.get("content-range");
    if (cr) setResponseHeader(event, "Content-Range", cr);
    const ar = res.headers.get("accept-ranges");
    if (ar) setResponseHeader(event, "Accept-Ranges", ar);
    return sendStream(event, res.body as ReadableStream);
  } finally {
    clearTimeout(timeout);
  }
});
