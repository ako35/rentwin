-- Ek sürücü formunda ehliyet no yerine TC kimlik no tutulacak. Var olan
-- ehliyet-no değerleri anlamsız hale geldiği için taşınmıyor (sütun adı
-- değişiyor, veri tipi aynı kalıyor).

ALTER TABLE "ContractDriver" RENAME COLUMN "licenseNo" TO "nationalId";
