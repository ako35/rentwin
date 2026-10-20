// Copies sensitive objects from the public media bucket to the private bucket,
// verifies the copy, removes the public copy, and clears the stale public URL
// from the database. Dry-run unless --apply is passed. Safe to rerun after a
// partial failure.
const fs = require("fs");
const path = require("path");
const envLocal = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envLocal)) {
  require("dotenv").config({ path: envLocal });
}
require("dotenv").config();

const prisma = require("../src/lib/prisma");
const { copyPublicFileToPrivate, migratePublicFileToPrivate } = require("../src/lib/storage");

const collections = [
  { model: "userDocument", urlField: "blobUrl", label: "customer documents", nullable: false },
  { model: "vehicleDocument", urlField: "blobUrl", label: "vehicle documents", nullable: false },
  { model: "contractPhoto", urlField: "blobUrl", label: "contract photos", nullable: false },
  { model: "invoice", pathField: "pdfPathname", urlField: "pdfUrl", label: "invoice PDFs", nullable: true },
];

const main = async () => {
  const apply = process.argv.includes("--apply");
  const copyOnly = process.argv.includes("--copy-only");
  if (apply && copyOnly) throw new Error("Choose either --copy-only or --apply, not both.");
  if (!process.env.R2_PRIVATE_BUCKET) throw new Error("Set R2_PRIVATE_BUCKET before migrating.");
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL to the intended database.");

  console.log(
    apply
      ? "APPLY mode: files will be copied, public copies deleted, and old public URLs cleared."
      : copyOnly
        ? "COPY ONLY mode: files will be copied and verified; public copies and database rows are unchanged."
        : "DRY RUN: no objects or rows will be changed."
  );
  console.log(`Public bucket: ${process.env.R2_BUCKET}`);
  console.log(`Private bucket: ${process.env.R2_PRIVATE_BUCKET}`);

  let migrated = 0;
  let failed = 0;
  for (const collection of collections) {
    const pathField = collection.pathField || "pathname";
    const where = collection.nullable ? { [pathField]: { not: null } } : {};
    const rows = await prisma[collection.model].findMany({
      where,
      select: { id: true, [pathField]: true, [collection.urlField]: true },
    });
    console.log(`${collection.label}: ${rows.length} record(s)`);

    for (const row of rows) {
      const pathname = row[pathField];
      if (!pathname) continue;
      if (!apply && !copyOnly) {
        console.log(`  would migrate ${collection.model}/${row.id}: ${pathname}`);
        continue;
      }

      try {
        if (copyOnly) {
          await copyPublicFileToPrivate(pathname);
        } else {
          await migratePublicFileToPrivate(pathname);
          await prisma[collection.model].update({
            where: { id: row.id },
            data: { [collection.urlField]: null },
          });
        }
        migrated += 1;
      } catch (error) {
        failed += 1;
        console.error(`  FAILED ${collection.model}/${row.id} (${pathname}): ${error.message}`);
      }
    }
  }

  if (apply || copyOnly) console.log(`Migration finished: ${migrated} processed, ${failed} failed.`);
  if (failed) process.exitCode = 1;
};

main()
  .catch((error) => {
    console.error("Private media migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
