-- Which company (under the RENTWİN trade name) issues a given contract.
-- Additive; null on every existing row keeps those contracts printing under
-- the old combined "RENTWİN çatı markası" wording — only new/edited
-- contracts that pick one get the new single-company contract text.

-- CreateEnum
CREATE TYPE "LessorCompany" AS ENUM ('SAIR', 'MOVILO');

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN "lessorCompany" "LessorCompany";
