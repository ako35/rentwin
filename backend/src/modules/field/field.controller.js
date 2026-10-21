// Endpoints shaped for the Rentwin Saha mobile app (field crew). The older
// /contracts/admin/schedule/auth stays as-is for the web dashboard and for
// already-installed app builds that still call it.

const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");
const { modelImageKey } = require("../../lib/serializers");
const { loadModelImageMap } = require("../vehicles/vehicles.shared");
const { num } = require("../contracts/contract-fields");

// Contract times are naive Turkey wall-clock stored as UTC (the admin form
// sends "MM/DD/YYYY HH:mm" and the server parses it as UTC), so the crew's
// "today" must be cut on that same wall-clock, not on the server's UTC day —
// otherwise the list rolls over at 03:00 local. Türkiye has no DST.
const TR_OFFSET_MS = 3 * 60 * 60 * 1000;
const wallDayStart = (offsetDays = 0) => {
  const wall = new Date(Date.now() + TR_OFFSET_MS);
  return new Date(Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate() + offsetDays));
};

// A pickup nobody photographed is only worth chasing for a day; contracts
// handed over before the app existed would otherwise sit in the list forever.
// An overdue return is different — the car is still out — but past a week
// it's an office follow-up, not a field task.
const PICKUP_LOOKBACK_DAYS = 1;
const RETURN_LOOKBACK_DAYS = 7;

const OPEN_STATUS = { notIn: ["CANCELLED", "DONE"] };

const resolveCarImage = (car, modelImages) =>
  modelImages.get(modelImageKey(car.brand, car.model, car.color))?.blobUrl ||
  modelImages.get(modelImageKey(car.brand, car.model))?.blobUrl ||
  car.images?.[0]?.blobUrl ||
  null;

const customerName = (user) =>
  (user?.companyTitle || `${user?.firstName || ""} ${user?.lastName || ""}`).trim() || null;

const photoCounts = (photos) => ({
  PICKUP: photos.filter((p) => p.stage === "PICKUP").length,
  RETURN: photos.filter((p) => p.stage === "RETURN").length,
});

const SCHEDULE_INCLUDE = {
  car: { include: { images: { orderBy: { createdAt: "asc" }, take: 1 } } },
  user: { select: { firstName: true, lastName: true, companyTitle: true, phoneNumber: true } },
  photos: { select: { stage: true } },
};

// GET /field/schedule/auth -> { departures, returns }. Each row carries a
// `bucket` (overdue | today | tomorrow) on the wall-clock day and `done`
// once photos for its stage exist; done rows from before today are dropped.
const getFieldSchedule = asyncHandler(async (req, res) => {
  const todayStart = wallDayStart(0);
  const tomorrowStart = wallDayStart(1);
  const windowEnd = wallDayStart(2);

  const [pickups, returns, modelImages] = await Promise.all([
    prisma.contract.findMany({
      where: {
        status: OPEN_STATUS,
        pickUpTime: { gte: wallDayStart(-PICKUP_LOOKBACK_DAYS), lt: windowEnd },
      },
      orderBy: { pickUpTime: "asc" },
      include: SCHEDULE_INCLUDE,
    }),
    prisma.contract.findMany({
      where: {
        status: OPEN_STATUS,
        dropOffTime: { gte: wallDayStart(-RETURN_LOOKBACK_DAYS), lt: windowEnd },
      },
      orderBy: { dropOffTime: "asc" },
      include: SCHEDULE_INCLUDE,
    }),
    loadModelImageMap(),
  ]);

  const toRow = (contract, stage) => {
    const time = stage === "PICKUP" ? contract.pickUpTime : contract.dropOffTime;
    const bucket = time < todayStart ? "overdue" : time < tomorrowStart ? "today" : "tomorrow";
    const photoCount = photoCounts(contract.photos)[stage];
    return {
      id: contract.id,
      contractNo: contract.contractNo || null,
      stage,
      time,
      location: stage === "PICKUP" ? contract.pickUpLocation : contract.dropOffLocation,
      bucket,
      done: photoCount > 0,
      photoCount,
      flightNo: contract.flightNo || null,
      car: contract.car
        ? {
            brand: contract.car.brand,
            model: contract.car.model,
            licensePlate: contract.car.licensePlate,
            image: resolveCarImage(contract.car, modelImages),
          }
        : null,
      customer: { name: customerName(contract.user), phone: contract.user?.phoneNumber || null },
    };
  };

  const build = (contracts, stage) =>
    contracts.map((c) => toRow(c, stage)).filter((row) => !(row.done && row.bucket === "overdue"));

  res.json({ departures: build(pickups, "PICKUP"), returns: build(returns, "RETURN") });
});

// GET /field/contracts/:id/auth — what the crew needs at the car: who, when,
// where, notes, the readings recorded so far and how many photos exist.
const getFieldContract = asyncHandler(async (req, res) => {
  const [contract, modelImages] = await Promise.all([
    prisma.contract.findUnique({
      where: { id: req.params.id },
      include: {
        car: { include: { images: { orderBy: { createdAt: "asc" }, take: 1 } } },
        user: {
          select: {
            firstName: true,
            lastName: true,
            companyTitle: true,
            customerType: true,
            phoneNumber: true,
            email: true,
          },
        },
        drivers: { orderBy: { createdAt: "asc" }, select: { firstName: true, lastName: true, phone: true } },
        photos: { select: { stage: true } },
      },
    }),
    loadModelImageMap(),
  ]);
  if (!contract) throw new HttpError(404, "Contract not found.");

  const { car, user } = contract;
  const isCorporate = user?.customerType === "Kurumsal";
  res.json({
    id: contract.id,
    contractNo: contract.contractNo || null,
    status: contract.status,
    pickUpTime: contract.pickUpTime,
    dropOffTime: contract.dropOffTime,
    pickUpLocation: contract.pickUpLocation,
    dropOffLocation: contract.dropOffLocation,
    flightNo: contract.flightNo || null,
    customerNote: contract.customerNote || null,
    adminNote: contract.adminNote || null,
    readings: {
      pickUpKm: contract.pickUpKm,
      pickUpFuelEighths: contract.pickUpFuelEighths,
      returnKm: contract.returnKm,
      returnFuelEighths: contract.returnFuelEighths,
    },
    car: car
      ? {
          brand: car.brand,
          model: car.model,
          licensePlate: car.licensePlate,
          color: car.color || null,
          modelYear: car.modelYear || null,
          transmission: car.transmission,
          fuelType: car.fuelType,
          currentKm: car.currentKm,
          currentFuelEighths: car.currentFuelEighths,
          image: resolveCarImage(car, modelImages),
        }
      : null,
    customer: user
      ? {
          name: customerName(user),
          contactName: isCorporate ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || null : null,
          phone: user.phoneNumber || null,
          email: user.email || null,
          isCorporate,
        }
      : null,
    drivers: contract.drivers.map((d) => ({
      name: `${d.firstName} ${d.lastName}`.trim(),
      phone: d.phone || null,
    })),
    photoCounts: photoCounts(contract.photos),
  });
});

// PUT /field/contracts/:id/readings/auth { stage, km, fuelEighths }.
// Only records the odometer/fuel on the contract — it never closes it. The
// office's "Araç Teslim Al" modal prefills from returnKm/returnFuelEighths
// and stays the single place that closes a contract and prices overage.
const saveFieldReadings = asyncHandler(async (req, res) => {
  const { stage } = req.body || {};
  if (stage !== "PICKUP" && stage !== "RETURN") throw new HttpError(400, "Geçersiz aşama.");

  const km = num(req.body.km);
  const fuelEighths = num(req.body.fuelEighths);
  if (km == null || !Number.isInteger(km) || km < 0 || km > 2000000) {
    throw new HttpError(400, "Geçerli bir km değeri girilmelidir.", "INVALID_KM");
  }
  if (fuelEighths == null || !Number.isInteger(fuelEighths) || fuelEighths < 0 || fuelEighths > 8) {
    throw new HttpError(400, "Yakıt göstergesi 0-8 aralığında olmalıdır.", "INVALID_FUEL");
  }

  const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
  if (!contract) throw new HttpError(404, "Contract not found.");
  if (contract.status !== "CREATED") {
    throw new HttpError(409, "Kontrat kapatılmış; km ve yakıt ofisten düzenlenmeli.", "CONTRACT_CLOSED");
  }
  if (stage === "RETURN" && contract.pickUpKm != null && km < contract.pickUpKm) {
    throw new HttpError(400, "Dönüş km alış km'sinden küçük olamaz.", "RETURN_KM_BELOW_PICKUP");
  }

  const data =
    stage === "PICKUP"
      ? { pickUpKm: km, pickUpFuelEighths: fuelEighths }
      : { returnKm: km, returnFuelEighths: fuelEighths };
  const updated = await prisma.contract.update({ where: { id: contract.id }, data });

  res.json({
    pickUpKm: updated.pickUpKm,
    pickUpFuelEighths: updated.pickUpFuelEighths,
    returnKm: updated.returnKm,
    returnFuelEighths: updated.returnFuelEighths,
  });
});

module.exports = { getFieldSchedule, getFieldContract, saveFieldReadings };
