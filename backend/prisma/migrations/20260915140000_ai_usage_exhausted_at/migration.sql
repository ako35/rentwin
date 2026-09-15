-- Drop the guessed daily-limit approach: record the count Google's own 429
-- actually hit at, instead of asserting a number we don't know. Additive:
-- nullable column on the existing table.

ALTER TABLE "AiUsageCounter" ADD COLUMN "exhaustedAt" INTEGER;
