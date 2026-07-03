import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getS3Client, getBucket, headObject } from "./s3";
import { upsertEntry, listAll } from "./db";

export async function recoverIndexFromS3(): Promise<number> {
  const client = getS3Client();
  const bucket = getBucket();
  let recovered = 0;

  let continuationToken: string | undefined;
  do {
    const cmd = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: "cache/",
      ContinuationToken: continuationToken,
    });
    const resp = await client.send(cmd);

    for (const obj of resp.Contents ?? []) {
      if (!obj.Key || !obj.Size) continue;
      const key = obj.Key.replace(/^cache\//, "").replace(/\.bin$/, "");
      const existing = listAll().find((r) => r.object_key === obj.Key);
      if (existing) continue;

      const head = await headObject(obj.Key).catch(() => null);
      const now = Date.now();
      upsertEntry({
        key,
        object_key: obj.Key,
        content_type: head?.ContentType ?? "application/octet-stream",
        size_bytes: obj.Size,
        created_at: obj.LastModified?.getTime() ?? now,
        last_accessed_at: now,
        status: "ready",
        error: null,
      });
      recovered++;
    }

    continuationToken = resp.NextContinuationToken;
  } while (continuationToken);

  return recovered;
}
