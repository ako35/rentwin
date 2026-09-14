const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { deleteImage } = require("../../lib/blob");
const { slugify } = require("../../lib/site");
const asyncHandler = require("../../middleware/async-handler");

// Drop the blob + orphan VehicleImage row an image id points at.
const removeImage = async (imageId) => {
  const image = await prisma.vehicleImage.findUnique({ where: { id: imageId } });
  if (!image) return;
  try {
    await deleteImage(image.pathname);
  } catch (err) {
    // blob already gone — still drop the row
  }
  await prisma.vehicleImage.delete({ where: { id: image.id } });
};

const toDate = (value) => (value ? new Date(value) : null);

// content is trusted admin-authored HTML (from the rich-text editor) — every
// write here sits behind requireAdmin, so it's rendered on the frontend
// without sanitization, same trust level as the rest of the admin surface.
const buildData = (body, { forCreate = false } = {}) => {
  const data = {};
  if (typeof body.title === "string" || forCreate) data.title = (body.title || "").trim();
  if (typeof body.excerpt === "string" || forCreate) data.excerpt = (body.excerpt || "").trim();
  if (typeof body.content === "string" || forCreate) data.content = body.content || "";
  if ("imageId" in body || forCreate) data.imageId = body.imageId || null;
  if ("published" in body || forCreate) data.published = body.published ?? true;
  if ("publishedAt" in body || forCreate) data.publishedAt = toDate(body.publishedAt) || new Date();
  if (typeof body.slug === "string" && body.slug.trim()) {
    data.slug = slugify(body.slug.trim());
  } else if (forCreate) {
    data.slug = slugify(body.title || "");
  }
  return data;
};

// Public — only published posts, newest first.
const getPublicPosts = asyncHandler(async (req, res) => {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
  });
  res.json(posts);
});

// Public single post — a draft (or unknown slug) 404s, matching the
// sold-vehicle guard: a bot and a browser must never see different pages for
// the same URL.
const getPostBySlug = asyncHandler(async (req, res) => {
  const post = await prisma.blogPost.findUnique({ where: { slug: req.params.slug } });
  if (!post || !post.published) throw new HttpError(404, "Post not found.");
  res.json(post);
});

// Admin — every post, drafts included.
const getAllPosts = asyncHandler(async (req, res) => {
  const posts = await prisma.blogPost.findMany({ orderBy: { publishedAt: "desc" } });
  res.json(posts);
});

const createPost = asyncHandler(async (req, res) => {
  const data = buildData(req.body, { forCreate: true });
  if (!data.title || !data.excerpt || !data.content) {
    throw new HttpError(400, "Title, excerpt and content are required.");
  }
  if (!data.slug) throw new HttpError(400, "Slug could not be derived from the title.");

  const post = await prisma.blogPost.create({ data });
  res.status(201).json(post);
});

const updatePost = asyncHandler(async (req, res) => {
  const target = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "Post not found.");

  const data = buildData(req.body);
  if ("title" in data && !data.title) throw new HttpError(400, "Title is required.");
  if ("excerpt" in data && !data.excerpt) throw new HttpError(400, "Excerpt is required.");
  if ("content" in data && !data.content) throw new HttpError(400, "Content is required.");

  const post = await prisma.blogPost.update({ where: { id: target.id }, data });
  if (target.imageId && target.imageId !== data.imageId && "imageId" in data) {
    await removeImage(target.imageId);
  }
  res.json(post);
});

const deletePost = asyncHandler(async (req, res) => {
  const target = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "Post not found.");

  await prisma.blogPost.delete({ where: { id: target.id } });
  if (target.imageId) await removeImage(target.imageId);
  res.json({ message: "Post deleted." });
});

module.exports = {
  getPublicPosts,
  getPostBySlug,
  getAllPosts,
  createPost,
  updatePost,
  deletePost,
};
