-- One-time backfill: every contract that was already closed (DONE) before
-- İmza Takibi existed is marked as signed, so the "İmza Bekleyen" panel only
-- surfaces contracts closed from this point on without a captured signature.
-- Runs once (Prisma tracks applied migrations) — never touches contracts
-- that close later, even though they'll also be DONE + signedAt IS NULL.

UPDATE "Contract"
SET "signedAt" = COALESCE("returnedAt", "dropOffTime"),
    "signedBy" = 'Toplu işaretleme (geçmiş kontratlar)'
WHERE "status" = 'DONE' AND "signedAt" IS NULL;
