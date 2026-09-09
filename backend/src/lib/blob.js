const { put, del } = require("@vercel/blob");
const { randomUUID } = require("crypto");

const uploadImage = async (file, prefix = "vehicles") => {
  const pathname = `${prefix}/${randomUUID()}-${file.originalname}`;
  const blob = await put(pathname, file.buffer, {
    access: "public",
    contentType: file.mimetype,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return { blobUrl: blob.url, pathname };
};

const deleteImage = (pathname) =>
  del(pathname, { token: process.env.BLOB_READ_WRITE_TOKEN });

module.exports = { uploadImage, deleteImage };
