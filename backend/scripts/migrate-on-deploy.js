// Applies pending Prisma migrations to the production DB *during the Vercel
// build*, so the schema is migrated in lockstep with the code that needs it.
// (Pushing schema-change code without migrating first took prod down once —
// see the deploy-ordering note in the project memory.)
//
// Local installs and fresh clones skip this: migrate dev/prod by hand there.
const { execSync } = require("child_process");
try {
  require("dotenv").config();
} catch {
  /* dotenv not installed yet during a cold install — env vars still work */
}

if (!process.env.VERCEL) {
  console.log("[migrate-on-deploy] not a Vercel build — skipping `prisma migrate deploy`");
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error("[migrate-on-deploy] Vercel build but DATABASE_URL is unset — aborting the build");
  process.exit(1);
}

console.log("[migrate-on-deploy] applying pending migrations to the production database…");
// Throws (non-zero exit) on failure -> npm install fails -> the build fails and
// the current working deployment stays live. Never let a bad migration ship.
execSync("prisma migrate deploy", { stdio: "inherit" });
