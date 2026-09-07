-- Contact form now collects a phone number for a faster call-back. Additive,
-- nullable — existing rows are untouched.

ALTER TABLE "ContactMessage" ADD COLUMN "phone" TEXT;
