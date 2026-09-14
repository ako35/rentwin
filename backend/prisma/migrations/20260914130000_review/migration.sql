-- Public customer reviews (star rating + text). Visitor-submitted, admin-
-- moderated before showing on the public /yorumlar page and feeding the
-- homepage's AggregateRating JSON-LD (see backend/src/lib/seo-ld.js
-- autoRentalLd).

CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moderatedAt" TIMESTAMP(3),

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Review_status_createdAt_idx" ON "Review"("status", "createdAt");
