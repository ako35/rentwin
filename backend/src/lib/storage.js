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
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { randomUUID } = require("crypto");

const client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT, // https://<account-id>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const uploadImage = async (file, prefix = "vehicles") => {
  const pathname = `${prefix}/${randomUUID()}-${file.originalname}`;
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: pathname,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  return { blobUrl: `${process.env.R2_PUBLIC_URL}/${pathname}`, pathname };
};

const deleteImage = (pathname) =>
  client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: pathname }));

module.exports = { uploadImage, deleteImage };
