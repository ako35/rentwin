-- Default deposit amount, pre-filled into new contracts from Ayarlar
-- (Sözleşme Fiyat Varsayılanları). Additive, mirrors the other default* fee
-- columns on Setting.
ALTER TABLE "Setting" ADD COLUMN "defaultDeposit" DOUBLE PRECISION;
