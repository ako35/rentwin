-- SEO content-marketing blog posts, shown at /blog and /blog/:slug.
-- Additive — a brand-new table. Unlike Location's on-the-fly slugify(name),
-- `slug` is persisted so a post's URL survives title edits. `published` is
-- the only visibility gate (mirrors Campaign.active). imageId points at an
-- orphan VehicleImage row (the generic blob store, see modules/files) — no
-- FK, matching Location/Campaign.

CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageId" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");
