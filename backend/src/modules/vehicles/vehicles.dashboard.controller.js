const prisma = require("../../lib/prisma");
const asyncHandler = require("../../middleware/async-handler");
const { getRentedVehicleIds } = require("./vehicles.shared");

// Vehicles due for maintenance/inspection within this many days count toward
// the dashboard's "Bakım"/"Muayene" alert badges.
const DUE_SOON_DAYS = 30;

const isDueSoon = (date) => {
  if (!date) return false;
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + DUE_SOON_DAYS);
  return new Date(date) <= threshold;
};

const getFleetStats = asyncHandler(async (req, res) => {
  const { branchId } = req.query;
  const vehicles = await prisma.vehicle.findMany({
    where: branchId ? { branchId } : undefined,
    select: {
      id: true,
      outOfService: true,
      nextMaintenanceDate: true,
      nextInspectionDate: true,
    },
  });

  const outOfService = vehicles.filter((v) => v.outOfService).length;
  const inServiceIds = vehicles.filter((v) => !v.outOfService).map((v) => v.id);
  const rentedIds = await getRentedVehicleIds(inServiceIds);

  const total = vehicles.length;
  const rented = rentedIds.size;
  const available = total - outOfService - rented;
  const rate = (count) => (total > 0 ? Math.round((count / total) * 100) : 0);
  const maintenanceDue = vehicles.filter((v) => isDueSoon(v.nextMaintenanceDate)).length;
  const inspectionDue = vehicles.filter((v) => isDueSoon(v.nextInspectionDate)).length;

  res.json({
    total,
    rented,
    available,
    outOfService,
    occupancyRate: rate(rented),
    outOfServiceRate: rate(outOfService),
    maintenanceDue,
    inspectionDue,
  });
});

// Vehicles whose insurance / kasko / MTV / inspection expires within this many
// days (or is already overdue) drive the dashboard expiry-alert bar.
const EXPIRY_WINDOW_DAYS = 30;

const getExpiryAlerts = asyncHandler(async (req, res) => {
  const { branchId } = req.query;
  const vehicleWhere = branchId ? { branchId } : {};
  const now = new Date();
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + EXPIRY_WINDOW_DAYS);

  const carSelect = { select: { id: true, licensePlate: true, brand: true, model: true } };

  const [insurances, inspections, taxes, maintenances] = await Promise.all([
    prisma.vehicleInsurance.findMany({
      where: { vehicle: vehicleWhere },
      select: { vehicleId: true, type: true, endDate: true, vehicle: carSelect },
    }),
    prisma.vehicleInspection.findMany({
      where: { vehicle: vehicleWhere, expiryDate: { not: null } },
      select: { vehicleId: true, expiryDate: true, vehicle: carSelect },
    }),
    prisma.vehicleTax.findMany({
      where: { vehicle: vehicleWhere, paidDate: null, dueDate: { not: null } },
      select: { vehicleId: true, dueDate: true, vehicle: carSelect },
    }),
    prisma.vehicleMaintenance.findMany({
      where: { vehicle: vehicleWhere, nextDate: { not: null } },
      select: { vehicleId: true, nextDate: true, vehicle: carSelect },
    }),
  ]);

  const toItem = (car, date) => ({
    vehicleId: car.id,
    plate: car.licensePlate,
    name: [car.brand, car.model].filter(Boolean).join(" "),
    date,
    daysLeft: Math.ceil((new Date(date).getTime() - now.getTime()) / 86400000),
  });

  // Keep only the most recent record per vehicle (a renewal pushes the date out);
  // alert when that latest date still falls inside the window / is overdue.
  const latestPerVehicle = (rows, dateKey, keyFn = (r) => r.vehicleId) => {
    const map = new Map();
    for (const row of rows) {
      const key = keyFn(row);
      const current = map.get(key);
      if (!current || new Date(row[dateKey]) > new Date(current[dateKey])) map.set(key, row);
    }
    return [...map.values()];
  };

  const insuranceLatest = latestPerVehicle(
    insurances,
    "endDate",
    (r) => `${r.vehicleId}|${r.type}`
  );

  const categories = { insurance: [], kasko: [], tax: [], inspection: [], maintenance: [] };

  for (const row of insuranceLatest) {
    if (new Date(row.endDate) <= threshold) {
      const bucket = row.type === "Kasko" ? "kasko" : "insurance";
      categories[bucket].push(toItem(row.vehicle, row.endDate));
    }
  }
  for (const row of latestPerVehicle(inspections, "expiryDate")) {
    if (new Date(row.expiryDate) <= threshold) {
      categories.inspection.push(toItem(row.vehicle, row.expiryDate));
    }
  }
  for (const row of latestPerVehicle(maintenances, "nextDate")) {
    if (new Date(row.nextDate) <= threshold) {
      categories.maintenance.push(toItem(row.vehicle, row.nextDate));
    }
  }
  // MTV: earliest unpaid instalment still due within the window, one row per vehicle.
  const taxByVehicle = new Map();
  for (const row of taxes) {
    if (new Date(row.dueDate) > threshold) continue;
    const current = taxByVehicle.get(row.vehicleId);
    if (!current || new Date(row.dueDate) < new Date(current.dueDate)) taxByVehicle.set(row.vehicleId, row);
  }
  for (const row of taxByVehicle.values()) {
    categories.tax.push(toItem(row.vehicle, row.dueDate));
  }

  Object.values(categories).forEach((list) => list.sort((a, b) => a.daysLeft - b.daysLeft));

  res.json({ windowDays: EXPIRY_WINDOW_DAYS, categories });
});

module.exports = { getFleetStats, getExpiryAlerts };
