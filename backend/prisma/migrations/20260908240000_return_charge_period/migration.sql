-- Optional date range a return charge covers. Meaningful for HGS_OGS toll
-- lines: which travel dates the reflected toll is for. Left null for every
-- other category and for existing rows.
ALTER TABLE "ContractReturnCharge" ADD COLUMN "periodFrom" TIMESTAMP(3);
ALTER TABLE "ContractReturnCharge" ADD COLUMN "periodTo" TIMESTAMP(3);
