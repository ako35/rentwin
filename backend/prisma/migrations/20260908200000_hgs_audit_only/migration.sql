-- The HGS/OGS block becomes an audit checkbox: status + a confirmation
-- timestamp + who confirmed + an optional note. Toll amounts move entirely to
-- the Dönüş Ekstra tab. Additive — three nullable columns; the old
-- hgsCheckedFrom/To/Amount/Reflected columns are left in place but unused.

ALTER TABLE "Contract" ADD COLUMN "hgsCheckedAt" TIMESTAMP(3);
ALTER TABLE "Contract" ADD COLUMN "hgsCheckedBy" TEXT;
ALTER TABLE "Contract" ADD COLUMN "hgsNote" TEXT;
