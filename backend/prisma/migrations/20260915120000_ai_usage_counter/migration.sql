-- Informational counter for the shared Gemini vision free-tier daily quota
-- (ruhsat + kimlik/vergi levhası reads share one pool). Additive: a brand-new
-- table.

CREATE TABLE "AiUsageCounter" (
    "id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiUsageCounter_pkey" PRIMARY KEY ("id")
);
