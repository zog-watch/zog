import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type HeadObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | null = null;

export function getS3Client() {
  if (client) return client;
  const cfg = useRuntimeConfig().s3;
  if (!cfg.endpoint || !cfg.accessKeyId || !cfg.secretAccessKey) {
    throw new Error("S3 client is not configured (missing endpoint / credentials)");
  }
  client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
  return client;
}

export function getBucket() {
  return useRuntimeConfig().s3.bucket;
}

export async function headObject(key: string): Promise<HeadObjectCommandOutput | null> {
  try {
    const res = await getS3Client().send(
      new HeadObjectCommand({ Bucket: getBucket(), Key: key }),
    );
    return res;
  } catch (err: any) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === "NotFound") {
      return null;
    }
    throw err;
  }
}

export async function putObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
) {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function deleteObject(key: string) {
  await getS3Client().send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: key }),
  );
}

export async function getObjectStream(key: string) {
  const res = await getS3Client().send(
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
  );
  if (!res.Body) throw new Error(`Empty body for ${key}`);
  return res.Body as unknown as ReadableStream;
}

export async function getSignedDownloadUrl(key: string, ttlSeconds?: number) {
  const cfg = useRuntimeConfig().cache;
  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
    { expiresIn: ttlSeconds ?? cfg.signedUrlTtlSeconds },
  );
}
