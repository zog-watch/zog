const BASE_URL = "https://api.torbox.app/v1/api";

function token(): string {
  const cfg = useRuntimeConfig();
  return cfg.debirdToken;
}

interface TorrentListItem {
  id: number;
  hash: string;
  name: string;
  files: Array<{ id: number; name: string; size: number; mimetype?: string }>;
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

interface TorrentListResponse {
  success: boolean;
  data?: TorrentListItem | TorrentListItem[];
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${token()}` };
}

export async function addMagnetByHash(infoHash: string): Promise<number> {
  const magnet = `magnet:?xt=urn:btih:${infoHash.toLowerCase()}`;
  const form = new FormData();
  form.append("magnet", magnet);
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

export async function findTorrentIdByHash(infoHash: string): Promise<number | null> {
  // /mylist requires auth header. We can't query by hash directly, so we list all
  // and find. For a household app this is fine; for production you'd paginate.
  const res = await fetch(`${BASE_URL}/torrents/mylist`, { headers: authHeaders() });
  const json = (await res.json()) as TorrentListResponse;
  if (!json.success || !json.data) return null;
  const arr = Array.isArray(json.data) ? json.data : [json.data];
  const target = infoHash.toLowerCase();
  const found = arr.find((t) => t.hash.toLowerCase() === target);
  return found?.id ?? null;
}

export async function ensureTorrentIdByHash(infoHash: string): Promise<number> {
  const existing = await findTorrentIdByHash(infoHash);
  if (existing !== null) return existing;
  return addMagnetByHash(infoHash);
}

export async function getTorrentFileList(torrentId: number): Promise<TorrentListItem["files"]> {
  const res = await fetch(`${BASE_URL}/torrents/mylist?id=${torrentId}`, {
    headers: authHeaders(),
  });
  const json = (await res.json()) as TorrentListResponse;
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
