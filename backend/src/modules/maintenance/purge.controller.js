const dayjs = require("dayjs");
const prisma = require("../../lib/prisma");
const asyncHandler = require("../../middleware/async-handler");
const { purgeVehicle } = require("../../lib/vehicle-purge");

// Retention window: a sold vehicle and all of its rental paperwork are
// hard-deleted this long after the sale. The customer ledger is never touched
// (see lib/vehicle-purge.js).
const RETENTION_YEARS = 5;

// Vercel Cron target (vercel.json -> crons). Vercel signs the request with
// `Authorization: Bearer <CRON_SECRET>`; reject anything else so the endpoint
// can't be triggered from outside.
const purgeSoldVehicles = asyncHandler(async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ message: "Unauthorized." });
  }

  const cutoff = dayjs().subtract(RETENTION_YEARS, "year").toDate();
  const stale = await prisma.vehicle.findMany({
    where: { soldAt: { lte: cutoff } },
    select: { id: true, licensePlate: true },
  });

  const purged = [];
  const failed = [];
  for (const v of stale) {
    try {
      await purgeVehicle(v.id);
      purged.push(v.licensePlate);
    } catch (err) {
      console.error(`[purge] vehicle ${v.id} (${v.licensePlate}) failed:`, err.message);
      failed.push(v.licensePlate);
    }
  }

  console.log(`[purge] sold-vehicle sweep: ${purged.length} purged, ${failed.length} failed`);
  res.json({ cutoff, purged, failed });
});

module.exports = { purgeSoldVehicles };
