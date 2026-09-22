-- Kurumsal müşterilerde artık şirketin VKN'sinin (nationalId) yanında
-- yetkili kişinin kendi T.C. kimlik numarası da ayrı olarak tutuluyor.
-- Additive only.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "authorizedNationalId" TEXT;
