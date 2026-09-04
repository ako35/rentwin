// Prints which Neon branch the local backend is pointed at, so a destructive
// script or migration can't be run against production by accident.
//
//   node scripts/db-which.js
//
// "dev"  -> ep-autumn-hill-auclpur8  (isolated clone, safe to wipe)
// "MAIN" -> ep-old-star-aue18mp5     (PRODUCTION — used by Vercel)
require("dotenv").config();

const url = process.env.DATABASE_URL || "";
const host = (url.match(/@([^/]+)/) || [])[1] || "(no DATABASE_URL)";

const PROD_HOST = "ep-old-star-aue18mp5";
const DEV_HOST = "ep-autumn-hill-auclpur8";

let label = "UNKNOWN";
if (host.includes(PROD_HOST)) label = "MAIN / PRODUCTION";
else if (host.includes(DEV_HOST)) label = "dev (isolated)";

console.log(`\n  branch : ${label}`);
console.log(`  host   : ${host}\n`);

if (label.startsWith("MAIN")) {
  console.log("  ⚠  This is the PRODUCTION database. Do not run tests or seeds here.");
  console.log("     Point backend/.env back at the dev branch when you're done.\n");
  process.exitCode = 1;
}
