// Object storage for every uploaded file (vehicle/model photos, blog/campaign/
// location images, and — going forward — vehicle documents and contract
// pickup/return photos). Backed by Cloudflare R2 (S3-compatible API): unlike
// the Vercel Blob store this replaced, R2 charges zero egress, which matters
// once every contract adds its own hand-over/return photos — a volume that
// only grows, unlike the roughly fixed set of images per vehicle.
// `pathname` (the object key) is what every caller persists in the DB and
// passes back in to identify/delete a file; `blobUrl` is a public URL built
// from the bucket's public base URL, so existing rows (and every caller that
// just redirects to their stored blobUrl, e.g. files.controller.js's
// `display`) keep working unchanged regardless of which provider wrote them.
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { randomUUID, createHash } = require("crypto");

const client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT, // https://<account-id>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
});

// Sensitive records use a distinct bucket with public access disabled. The
// same scoped R2 token can access both buckets; R2_PUBLIC_URL is never used
// for keys stored in this bucket.
const privateClient = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
});

const privateBucket = () => {
  if (!process.env.R2_PRIVATE_BUCKET) {
    throw new Error("R2_PRIVATE_BUCKET must be configured for private files.");
  }
  if (process.env.R2_PRIVATE_BUCKET === process.env.R2_BUCKET) {
    throw new Error("R2_PRIVATE_BUCKET must be different from the public R2_BUCKET.");
  }
  return process.env.R2_PRIVATE_BUCKET;
};

const uploadImage = async (file, prefix = "vehicles") => {
  const pathname = `${prefix}/${randomUUID()}-${file.originalname}`;
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: pathname,
      Body: file.buffer,
      ContentType: file.mimetype,
      // This SDK version hardcodes PutObject as requiring a flexible checksum
      // (x-amz-checksum-*) regardless of the client's requestChecksumCalculation
      // setting above, and R2 rejects that header with a 401 — breaking every
      // upload. Supplying our own SHA256 here satisfies the SDK (it skips
      // auto-injecting one once this field is set) using the one checksum
      // style R2 actually accepts.
      ChecksumSHA256: createHash("sha256").update(file.buffer).digest("base64"),
    })
  );

  return { blobUrl: `${process.env.R2_PUBLIC_URL}/${pathname}`, pathname };
};

const deleteImage = (pathname) =>
  client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: pathname }));

const uploadPrivateFile = async (file, prefix) => {
  const pathname = `${prefix}/${randomUUID()}`;
  await privateClient.send(
    new PutObjectCommand({
      Bucket: privateBucket(),
      Key: pathname,
      Body: file.buffer,
      ContentType: file.mimetype || "application/octet-stream",
      ChecksumSHA256: createHash("sha256").update(file.buffer).digest("base64"),
    })
  );
  return { pathname };
};

const deletePrivateFile = async (pathname) => {
  // During and after migration, the same key can still exist in the legacy
  // public bucket. Delete both copies so removing a record cannot leave an
  // orphaned public object behind.
  const results = await Promise.allSettled([
    privateClient.send(new DeleteObjectCommand({ Bucket: privateBucket(), Key: pathname })),
    client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: pathname })),
  ]);
  const failed = results.find((result) => result.status === "rejected");
  if (failed) throw failed.reason;
};

const getPrivateUploadUrl = (pathname, contentType) =>
  getSignedUrl(
    privateClient,
    new PutObjectCommand({ Bucket: privateBucket(), Key: pathname, ContentType: contentType }),
    { expiresIn: 300 }
  );

const getPrivateDownloadUrl = (pathname, { inline = false, filename } = {}) => {
  const disposition = inline ? "inline" : "attachment";
  const safeName = filename ? `; filename*=UTF-8''${encodeURIComponent(filename)}` : "";
  return getSignedUrl(
    privateClient,
    new GetObjectCommand({
      Bucket: privateBucket(),
      Key: pathname,
      ResponseContentDisposition: `${disposition}${safeName}`,
    }),
    { expiresIn: 300 }
  );
};

const headPrivateFile = (pathname) =>
  privateClient.send(new HeadObjectCommand({ Bucket: privateBucket(), Key: pathname }));

const copyPublicFileToPrivate = async (pathname) => {
  const sourceBucket = process.env.R2_BUCKET;
  const targetBucket = privateBucket();
  try {
    await client.send(new HeadObjectCommand({ Bucket: sourceBucket, Key: pathname }));
    const copySource = `${sourceBucket}/${pathname.split("/").map(encodeURIComponent).join("/")}`;
    await privateClient.send(
      new CopyObjectCommand({
        Bucket: targetBucket,
        Key: pathname,
        CopySource: copySource,
        MetadataDirective: "COPY",
      })
    );
  } catch (error) {
    if (error.name !== "NotFound" && error.$metadata?.httpStatusCode !== 404) throw error;
    // Makes reruns safe after a previous copy succeeded and source was removed.
    await headPrivateFile(pathname);
  }
  return headPrivateFile(pathname);
};

const migratePublicFileToPrivate = async (pathname) => {
  await copyPublicFileToPrivate(pathname);
  await client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: pathname }));
};

// Direct-from-client upload (mobile app photo capture): the backend never
// sees the bytes, it just hands out a short-lived PUT URL straight to R2 —
// avoids routing potentially several full-resolution photos per contract
// through a serverless function's request-body limit. Every other upload
// feature in the app still goes through uploadImage() above; this is
// additive, not a replacement.
module.exports = {
  uploadImage,
  deleteImage,
  uploadPrivateFile,
  deletePrivateFile,
  getPrivateUploadUrl,
  getPrivateDownloadUrl,
  headPrivateFile,
  copyPublicFileToPrivate,
  migratePublicFileToPrivate,
};
