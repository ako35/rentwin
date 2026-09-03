-- Customers created from the admin panel may legitimately share an email
-- (a company address used for several counterparties, family members, ...).
-- DropIndex
DROP INDEX "User_email_key";
