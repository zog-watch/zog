// Bulk download script: query self-hosted addon → TorBox → cache.zog.watch
// Usage: node scripts/bulk-download.mjs

const ADDON = "https://addon.zog.watch";
const CACHE = "https://cache.zog.watch";
const TORBOX_API = "https://api.torbox.app/v1/api";
const TORBOX_TOKEN = process.env.TORBOX_TOKEN ?? "cfafb527-29bd-42fe-a4aa-3799b0f48bd4";
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 2);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getStreams(type, id) {
  const url = `${ADDON}/stream/${type}/${id}.json`;
  const res = await fetch(url, { headers: { "User-Agent": "bulk-downloader" } });
  if (!res.ok) throw new Error(`addon ${type}/${id}: ${res.status}`);
  const json = await res.json();
  return json.streams ?? [];
}

function pickBest(streams) {
  if (!streams.length) return null;
  // prefer 1080p, then 720p, then 4k, then anything with "BluRay" / "WEBRip"
  const score = (s) => {
    const t = (s.title || "").toLowerCase();
    if (t.includes("2160p") || t.includes("4k")) return 1;
    if (t.includes("1080p")) return 10;
    if (t.includes("720p")) return 20;
    if (t.includes("480p")) return 30;
    return 40;
  };
  const sorted = [...streams].sort((a, b) => score(a) - score(b));
  return sorted[0];
}

async function ensureTorBoxTorrent(infoHash) {
  // Try mylist first
  const listRes = await fetch(
    `${TORBOX_API}/torrents/mylist?token=${encodeURIComponent(TORBOX_TOKEN)}`,
    { headers: { Authorization: `Bearer ${TORBOX_TOKEN}` } },
  );
  if (listRes.ok) {
    const j = await listRes.json();
    if (j.success && j.data) {
      const arr = Array.isArray(j.data) ? j.data : [j.data];
      const found = arr.find((t) => t.hash.toLowerCase() === infoHash.toLowerCase());
      if (found) return found.id;
    }
  }
  // Add it
  const form = new FormData();
  form.append("magnet", `magnet:?xt=urn:btih:${infoHash.toLowerCase()}`);
  form.append("allow_zip", "false");
  const addRes = await fetch(`${TORBOX_API}/torrents/createtorrent`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TORBOX_TOKEN}` },
    body: form,
  });
  const j = await addRes.json();
  if (!j.success || !j.data) {
    throw new Error(`torbox addMagnet ${infoHash}: ${j.detail ?? j.error ?? addRes.status}`);
  }
  return j.data.torrent_id;
}

async function getTorBoxFiles(torrentId) {
  const r = await fetch(`${TORBOX_API}/torrents/mylist?id=${torrentId}`, {
    headers: { Authorization: `Bearer ${TORBOX_TOKEN}` },
  });
  const j = await r.json();
  if (!j.success || !j.data) throw new Error("torbox mylist failed");
  const item = Array.isArray(j.data) ? j.data[0] : j.data;
  return item.files ?? [];
}

function pickVideoFile(files) {
  return (
    files.find(
      (f) =>
        f.mimetype?.startsWith("video/") ??
        /\.(mp4|mkv|webm|m4v|avi)$/i.test(f.name),
    ) ?? null
  );
}

async function getTorBoxDownloadUrl(torrentId, fileId) {
  const r = await fetch(
    `${TORBOX_API}/torrents/requestdl?torrent_id=${torrentId}&file_id=${fileId}&token=${encodeURIComponent(TORBOX_TOKEN)}`,
  );
  const j = await r.json();
  if (!j.success || !j.data) throw new Error(`requestdl: ${j.detail ?? j.error ?? r.status}`);
  return j.data;
}

async function cacheEnsure(cacheKey, infoHash, fileIdx) {
  const u = new URL("/stream", CACHE);
  u.searchParams.set("key", cacheKey);
  u.searchParams.set("infoHash", infoHash);
  if (fileIdx !== undefined) u.searchParams.set("fileIdx", String(fileIdx));
  const res = await fetch(u, { method: "POST" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`cache ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function processOne(spec) {
  const { kind, key, imdb, season, episode, title } = spec;
  process.stdout.write(`[${key}] searching... `);
  let infoHash;
  let fileIdx;
  try {
    const streams =
      kind === "movie"
        ? await getStreams("movie", imdb)
        : await getStreams("series", `${imdb}:${season}:${episode}`);
    const best = pickBest(streams);
    if (!best || !best.infoHash) {
      console.log("NO STREAMS");
      return { ok: false, key, reason: "no streams" };
    }
    infoHash = best.infoHash;
    fileIdx = best.fileIdx;
    console.log(`got ${infoHash.slice(0, 12)}.../${fileIdx}`);
  } catch (e) {
    console.log(`INDEXER ERR: ${e.message}`);
    return { ok: false, key, reason: e.message };
  }
  try {
    const torrentId = await ensureTorBoxTorrent(infoHash);
    let targetFileId = fileIdx;
    if (targetFileId === 0 || targetFileId == null) {
      // pick the first video file (or a specific episode by name match)
      const files = await getTorBoxFiles(torrentId);
      let chosen = null;
      if (kind === "series" && season && episode) {
        const re = new RegExp(
          `s0?${season}e0?${episode}\\b|0?${season}x0?${episode}\\b`,
          "i",
        );
        chosen = files.find((f) => re.test(f.name));
      }
      if (!chosen) chosen = pickVideoFile(files);
      if (!chosen) {
        console.log("NO VIDEO FILE");
        return { ok: false, key, reason: "no video file in torrent" };
      }
      targetFileId = chosen.id;
    }
    process.stdout.write(`[${key}] torbox ok, downloading (file ${targetFileId})... `);
    const result = await cacheEnsure(key, infoHash, targetFileId);
    if (result.status === "ready") {
      const sizeMb = (result.size ?? 0) / 1024 / 1024;
      console.log(`OK (${sizeMb.toFixed(0)} MB, ${result.cached ? "cached" : "fresh"})`);
      return { ok: true, key, size: result.size, cached: result.cached };
    }
    console.log(`UNEXPECTED: ${JSON.stringify(result).slice(0, 100)}`);
    return { ok: false, key, reason: "unexpected response" };
  } catch (e) {
    console.log(`ERR: ${e.message}`);
    return { ok: false, key, reason: e.message };
  }
}

async function processBatch(specs) {
  const results = { ok: 0, fail: 0, items: [] };
  let i = 0;
  async function worker() {
    while (i < specs.length) {
      const idx = i++;
      const spec = specs[idx];
      const r = await processOne(spec);
      results.items.push(r);
      if (r.ok) results.ok++;
      else results.fail++;
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, specs.length) }, worker));
  return results;
}

const POPULAR_MOVIES = [
  { kind: "movie", key: "movie-shawshank", imdb: "tt0111161", title: "Shawshank Redemption" },
  { kind: "movie", key: "movie-godfather", imdb: "tt0068646", title: "The Godfather" },
  { kind: "movie", key: "movie-dark-knight", imdb: "tt0468569", title: "The Dark Knight" },
  { kind: "movie", key: "movie-pulp-fiction", imdb: "tt0110912", title: "Pulp Fiction" },
  { kind: "movie", key: "movie-forrest-gump", imdb: "tt0109830", title: "Forrest Gump" },
  { kind: "movie", key: "movie-inception", imdb: "tt1375666", title: "Inception" },
  { kind: "movie", key: "movie-matrix", imdb: "tt0133093", title: "The Matrix" },
  { kind: "movie", key: "movie-goodfellas", imdb: "tt0099685", title: "Goodfellas" },
  { kind: "movie", key: "movie-interstellar", imdb: "tt0816692", title: "Interstellar" },
  { kind: "movie", key: "movie-fight-club", imdb: "tt0137523", title: "Fight Club" },
];

// Two and a Half Men episode counts per season (from cinemeta/wikipedia)
const TAHM_SEASONS = {
  1: 24, 2: 24, 3: 24, 4: 24, 5: 19, 6: 24,
  7: 22, 8: 16, 9: 24, 10: 23, 11: 22, 12: 16,
};

function buildTahmSpecs() {
  const out = [];
  for (const [s, n] of Object.entries(TAHM_SEASONS)) {
    const sn = Number(s);
    for (let e = 1; e <= n; e++) {
      const pad = (x) => String(x).padStart(2, "0");
      out.push({
        kind: "series",
        key: `tahm-s${pad(sn)}e${pad(e)}`,
        imdb: "tt0369179",
        season: sn,
        episode: e,
        title: `Two and a Half Men S${pad(sn)}E${pad(e)}`,
      });
    }
  }
  return out;
}

const mode = process.argv[2] ?? "movies";
const all = mode === "all"
  ? [...POPULAR_MOVIES, ...buildTahmSpecs()]
  : mode === "tahm"
    ? buildTahmSpecs()
    : POPULAR_MOVIES;

console.log(`==> processing ${all.length} items (mode=${mode}, concurrency=${CONCURRENCY})`);
const t0 = Date.now();
const res = await processBatch(all);
const dt = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n==> done in ${dt}s: ${res.ok} ok, ${res.fail} fail`);

// print failures summary
const fails = res.items.filter((x) => !x.ok);
if (fails.length) {
  console.log(`\nfailures (${fails.length}):`);
  for (const f of fails) console.log(`  - ${f.key}: ${f.reason}`);
}
