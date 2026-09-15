-- Faturanın hangi kiralama dönemini (ör. aylık kontratta hangi ay) kapsadığını
-- kaydedebilmek için. Opsiyonel — mevcut faturalar etkilenmez.

ALTER TABLE "Invoice" ADD COLUMN "periodFrom" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN "periodTo" TIMESTAMP(3);
