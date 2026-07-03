const BASE_URL = "https://api.torbox.app/v1/api";

function token(): string {
  const cfg = useRuntimeConfig();
  return cfg.debirdToken;
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${token()}` };
}

interface CreateResponse {
  success: boolean;
  detail?: string;
  data?: { hash: string; torrent_id: number };
}

interface RequestDlResponse {
  success: boolean;
  detail?: string;
  data?: string;
}

interface MyListData {
  id: number;
  hash: string;
  name: string;
  files: Array<{ id: number; name: string; size: number; mimetype?: string }>;
}

export async function ensureTorrentIdByHash(infoHash: string): Promise<number> {
  // Try to find existing
  const list = await fetch(`${BASE_URL}/torrents/mylist?token=${token()}`, {
    headers: authHeaders(),
  });
  const lj = (await list.json()) as { data?: MyListData | MyListData[] };
  if (lj.success && lj.data) {
    const arr = Array.isArray(lj.data) ? lj.data : [lj.data];
    const found = arr.find((t) => t.hash.toLowerCase() === infoHash.toLowerCase());
    if (found) return found.id;
  }

  // Add the magnet
  const form = new FormData();
  form.append("magnet", `magnet:?xt=urn:btih:${infoHash.toLowerCase()}`);
  form.append("allow_zip", "false");
  const res = await fetch(`${BASE_URL}/torrents/createtorrent`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  const json = (await res.json()) as CreateResponse;
  if (!json.success || !json.data) {
    throw new Error(`torbox addMagnet failed: ${json.detail ?? res.status}`);
  }
  return json.data.torrent_id;
}

export async function getTorrentFiles(torrentId: number): Promise<MyListData["files"]> {
  const res = await fetch(`${BASE_URL}/torrents/mylist?id=${torrentId}`, {
    headers: authHeaders(),
  });
  const json = (await res.json()) as { success: boolean; detail?: string; data?: MyListData | MyListData[] };
  if (!json.success || !json.data) {
    throw new Error(`torbox list failed: ${json.detail ?? res.status}`);
  }
  const item = Array.isArray(json.data) ? json.data[0] : json.data;
  if (!item) throw new Error("torbox torrent not found");
  return item.files;
}

export async function getDownloadUrl(torrentId: number, fileId: number): Promise<string> {
  const url = `${BASE_URL}/torrents/requestdl?torrent_id=${torrentId}&file_id=${fileId}&token=${encodeURIComponent(token())}`;
  const res = await fetch(url, { method: "GET" });
  const json = (await res.json()) as RequestDlResponse;
  if (!json.success || !json.data) {
    throw new Error(`torbox requestdl failed: ${json.detail ?? res.status}`);
  }
  return json.data;
}

export function pickVideoFile(files: MyListData["files"]): MyListData["files"][number] | null {
  const video = files.find(
    (f) => f.mimetype?.startsWith("video/") ?? /\.(mp4|mkv|webm|mov|m4v)$/i.test(f.name),
  );
  return video ?? null;
}
