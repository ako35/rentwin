-- MTV taksit tutarı artık kayıt anında bilinmeyebilir (henüz açıklanmamış
-- olabilir), bu yüzden zorunlu olmaktan çıkarıldı. Existing rows keep their
-- values; the column just stops rejecting NULL going forward.

ALTER TABLE "VehicleTax" ALTER COLUMN "amount" DROP NOT NULL;
