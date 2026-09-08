const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { parseFrontendDateTime, resolveWindow } = require("../../lib/dates");
const { serializeScheduleRow, serializeVehicle } = require("../../lib/serializers");
const { parsePageParams, buildPageResponse } = require("../../lib/pagination");
const asyncHandler = require("../../middleware/async-handler");
const { ALLOWED_SORT_FIELDS } = require("./contracts.shared");
const { nextContractNo, num } = require("./contract-fields");
const { recomputeContractFinancials } = require("./contract-financials");
const { round2 } = require("../../lib/dates");
const { kbsStamp, kbsBlocksClose } = require("./kbs");
const { syncContractDebit, voidContractLedger, restoreContractLedger } = require("../../lib/ledger");
const { getBusyVehicleIds } = require("../../lib/availability");
const { readSettings } = require("../settings/settings.controller");

const RETURN_CHARGE_CATEGORIES = [
  "KM_EXCESS",
  "FUEL",
  "ONE_WAY",
  "DAMAGE",
  "ROADSIDE",
  "CLEANING",
  "HGS_OGS",
  "OTHER",
];

// Assign a fresh contract number, retrying on the rare create-race collision.
const createContractWithNo = async (data, client = prisma) => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await client.contract.create({ data: { ...data, contractNo: await nextContractNo(client) } });
    } catch (err) {
      const dup = err.code === "P2002" && String(err.meta?.target ?? "").includes("contractNo");
      if (dup && attempt < 5) continue;
      throw err;
    }
  }
};

const getContractsByPage = asyncHandler(async (req, res) => {
  const { page, size, direction, sortField } = parsePageParams(req.query, {
    defaultSize: 20,
    allowedSortFields: ALLOWED_SORT_FIELDS,
    // Default view: most recent pick-up first.
    defaultSortField: "pickUpTime",
    defaultDirection: "DESC",
  });

  const { branchId, status, plate, customer } = req.query;
  const statusFilter = ["CREATED", "CANCELLED", "DONE"].includes(status) ? status : null;
  const where = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(branchId ? { car: { branchId } } : {}),
    ...(plate
      ? { car: { ...(branchId ? { branchId } : {}), licensePlate: { contains: plate, mode: "insensitive" } } }
      : {}),
    ...(customer
      ? {
          OR: [
            { corporate: { title: { contains: customer, mode: "insensitive" } } },
            { user: { companyTitle: { contains: customer, mode: "insensitive" } } },
            { user: { firstName: { contains: customer, mode: "insensitive" } } },
            { user: { lastName: { contains: customer, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [content, totalElements] = await Promise.all([
    prisma.contract.findMany({
      where,
      skip: page * size,
      take: size,
      orderBy: [{ [sortField]: direction }, { id: "asc" }],
      include: {
        car: { select: { brand: true, model: true, licensePlate: true, branch: { select: { code: true } } } },
        user: { select: { firstName: true, lastName: true, companyTitle: true } },
        corporate: { select: { title: true } },
        payments: { select: { amount: true } },
        extensions: { select: { extraDays: true } },
      },
    }),
    prisma.contract.count({ where }),
  ]);

  const dayCount = (r) =>
    Math.max(1, Math.ceil((r.dropOffTime.getTime() - r.pickUpTime.getTime()) / 86400000));

  res.json(
    buildPageResponse({
      content: content.map((r) => ({
        id: r.id,
        contractNo: r.contractNo,
        status: r.status,
        pickUpTime: r.pickUpTime,
        dropOffTime: r.dropOffTime,
        pickUpLocation: r.pickUpLocation,
        dropOffLocation: r.dropOffLocation,
        branchCode: r.car?.branch?.code || null,
        totalPrice: r.totalPrice,
        collected: r.payments.reduce((s, p) => s + p.amount, 0),
        dayCount: dayCount(r),
        extensionDays: r.extensions.reduce((s, e) => s + e.extraDays, 0),
        plate: r.car?.licensePlate || null,
        vehicle: r.car ? `${r.car.brand} ${r.car.model}` : "",
        customerName:
          r.corporate?.title || r.user.companyTitle || `${r.user.firstName} ${r.user.lastName}`.trim(),
      })),
      totalElements,
      page,
      size,
      sortField,
    })
  );
});

// Admin-created contract: minimal draft, admin fills in the rest on the detail
// page. Optionally started from a reservation (`reservationId`).
const createContract = asyncHandler(async (req, res) => {
  const { carId, userId, pickUpTime, dropOffTime, pickUpLocation, dropOffLocation, reservationId } = req.body;

  if (!carId || !userId) throw new HttpError(400, "carId and userId are required.");

  const parsedPickUp = parseFrontendDateTime(pickUpTime);
  const parsedDropOff = parseFrontendDateTime(dropOffTime);
  if (!parsedPickUp || !parsedDropOff || parsedDropOff <= parsedPickUp) {
    throw new HttpError(400, "Invalid pick-up/drop-off time range.");
  }

  const [car, user] = await Promise.all([
    prisma.vehicle.findUnique({ where: { id: carId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
  ]);
  if (!car) throw new HttpError(404, "Vehicle not found.");
  if (!user) throw new HttpError(404, "Customer not found.");

  // Default rental terms come from the admin Settings page (Setting singleton);
  // the create form mirrors the same values, and the admin can still adjust or
  // switch to unlimited on the detail page.
  const s = await readSettings();

  const contract = await createContractWithNo({
    carId,
    userId,
    pickUpLocation: pickUpLocation || "",
    dropOffLocation: dropOffLocation || pickUpLocation || "",
    pickUpTime: parsedPickUp,
    dropOffTime: parsedDropOff,
    totalPrice: 0,
    status: "CREATED",
    unlimitedKm: false,
    dailyKmLimit: s.defaultDailyKmLimit ?? 300,
    monthlyKmLimit: s.defaultMonthlyKmLimit ?? null,
    kmOverageFee: s.defaultKmOverageFee ?? null,
    fuelFeePerEighth: s.defaultFuelFeePerEighth ?? null,
    reservationId: reservationId || null,
  });
  res.status(201).json({ id: contract.id });
});

// Vehicles free for [pickUpTime, dropOffTime): no overlapping open contract or
// pending/confirmed reservation, and not out of service. A returned (DONE)
// contract no longer holds its car. Feeds the contract + reservation vehicle
// pickers.
const getAvailableCarsAdmin = asyncHandler(async (req, res) => {
  const { pickUpTime, dropOffTime, excludeContractId, excludeReservationId } = req.query;
  const pickUp = parseFrontendDateTime(pickUpTime);
  const dropOff = parseFrontendDateTime(dropOffTime);
  if (!pickUp || !dropOff || dropOff <= pickUp) {
    throw new HttpError(400, "Invalid pick-up/drop-off time range.");
  }

  const busy = await getBusyVehicleIds(pickUp, dropOff, {
    excludeContractId,
    excludeReservationId,
  });

  const cars = await prisma.vehicle.findMany({
    where: { outOfService: false },
    orderBy: [{ brand: "asc" }, { model: "asc" }],
    include: { images: { orderBy: { createdAt: "asc" } }, branch: true },
  });

  res.json(cars.filter((car) => !busy.has(car.id)).map(serializeVehicle));
});

const deleteContract = asyncHandler(async (req, res) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
  if (!contract) throw new HttpError(404, "Contract not found.");

  await prisma.contract.delete({ where: { id: contract.id } });
  res.json({ message: "Contract deleted." });
});

// Lifecycle actions from the contract detail bar: "Araç Teslim Al" closes the
// contract (DONE), "Kontratı İptal Et" voids it (CANCELLED — frees the vehicle,
// drops out of customer balance), "Geri Aç" reopens it (CREATED, see below).
const setContractStatus = (status) =>
  asyncHandler(async (req, res) => {
    const existing = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Contract not found.");

    const contract = await prisma.contract.update({
      where: { id: existing.id },
      data: { status },
    });

    // Keep the current-account ledger in step with the lifecycle change.
    if (status === "CANCELLED") await voidContractLedger(contract.id);
    else await syncContractDebit(contract);

    res.json({ id: contract.id, status: contract.status });
  });

// "Geri Aç" -> CREATED. Reopening undoes the hand-back: the auto-generated
// km-overage / missing-fuel charges from that return are removed and the
// contract's cached financials + ledger fall back to the pre-return figures.
// Manually added return charges (tolls, damage, cleaning…) are kept. The
// recorded return km/fuel is cleared so a later return starts clean. Also
// re-mirrors payments in case the contract was CANCELLED (which had dropped
// every auto ledger row).
const reopenContract = asyncHandler(async (req, res) => {
  const existing = await prisma.contract.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new HttpError(404, "Contract not found.");

  const contract = await prisma.$transaction(async (tx) => {
    await tx.contract.update({
      where: { id: existing.id },
      data: { status: "CREATED", returnKm: null, returnFuelEighths: null, returnedAt: null },
    });
    // Undo only the km/fuel overage lines the return flow posted — HGS and
    // hand-added charges survive a reopen.
    await tx.contractReturnCharge.deleteMany({
      where: { contractId: existing.id, source: "RETURN" },
    });
    return recomputeContractFinancials(existing.id, tx);
  });

  await restoreContractLedger(contract);

  res.json({ id: contract.id, status: contract.status });
});

// Sanitise the return-modal's charge lines: known category, non-negative amount,
// positive integer quantity. Zero-amount lines are dropped.
const sanitizeReturnCharges = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c) => c && RETURN_CHARGE_CATEGORIES.includes(c.category))
    .map((c) => ({
      category: c.category,
      description: c.description ? String(c.description).slice(0, 500) : null,
      amount: round2(Math.max(0, num(c.amount) || 0)),
      quantity: Math.max(1, Math.round(num(c.quantity) || 1)),
      autoGenerated: true,
      source: "RETURN",
    }))
    .filter((c) => c.amount > 0);
};

// "Araç Teslim Al" -> DONE. Body: { returnKm?, returnFuelEighths?, releaseKbs?,
// charges?: [{category, description, amount, quantity}] }. Records the hand-back
// odometer/fuel, replaces this flow's own auto-generated return charges with the
// operator-confirmed set, recomputes the contract financials + ledger, and
// closes the contract — all atomically. A rental still filed in KABİS must be
// released first (releaseKbs: true chains the release).
const returnContract = asyncHandler(async (req, res) => {
  const existing = await prisma.contract.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new HttpError(404, "Contract not found.");
  if (existing.status === "CANCELLED") {
    throw new HttpError(409, "İptal edilmiş kontrat teslim alınamaz.");
  }

  const needsRelease = kbsBlocksClose(existing);
  const releaseKbs = req.body?.releaseKbs === true;
  if (needsRelease && !releaseKbs) {
    throw new HttpError(
      409,
      "Kontrat kapatılmadan önce KABİS kaydı düşülmelidir.",
      "KBS_NOT_RELEASED"
    );
  }

  const returnKm = num(req.body?.returnKm);
  const returnFuelEighths = num(req.body?.returnFuelEighths);
  if (returnKm != null && existing.pickUpKm != null && returnKm < existing.pickUpKm) {
    throw new HttpError(400, "Dönüş km alış km'sinden küçük olamaz.", "RETURN_KM_BELOW_PICKUP");
  }
  if (returnFuelEighths != null && (returnFuelEighths < 0 || returnFuelEighths > 8)) {
    throw new HttpError(400, "Yakıt göstergesi 0-8 aralığında olmalıdır.");
  }
  const charges = sanitizeReturnCharges(req.body?.charges);

  await prisma.$transaction(async (tx) => {
    // Update first — takes a row lock so a duplicate/concurrent return blocks
    // until this one commits, then replays the replace cleanly.
    await tx.contract.update({
      where: { id: existing.id },
      data: {
        status: "DONE",
        returnKm,
        returnFuelEighths,
        returnedAt: new Date(),
        ...(needsRelease && releaseKbs
          ? { kbsReleasedAt: new Date(), kbsReleasedBy: kbsStamp(req.user) }
          : {}),
      },
    });
    // Replace only this flow's own rows — manual + HGS charges are left alone.
    await tx.contractReturnCharge.deleteMany({
      where: { contractId: existing.id, source: "RETURN" },
    });
    if (charges.length) {
      await tx.contractReturnCharge.createMany({
        data: charges.map((c) => ({ ...c, contractId: existing.id })),
      });
    }
    await recomputeContractFinancials(existing.id, tx);
  });

  res.json({ id: existing.id, status: "DONE" });
});

const cancelContract = setContractStatus("CANCELLED");

// Admin dashboard "Returns"/"Departures" tables: contracts whose drop-off
// (returns) or pick-up (departures) falls within a day window from now.
// Always excludes CANCELLED; optionally excludes DONE too.
const getAdminSchedule = asyncHandler(async (req, res) => {
  const { type = "returns", window = "7", excludeCompleted, branchId } = req.query;
  const dateField = type === "departures" ? "pickUpTime" : "dropOffTime";
  const { from, to } = resolveWindow(window);

  const contracts = await prisma.contract.findMany({
    where: {
      [dateField]: { gte: from, lte: to },
      status: excludeCompleted === "true" ? { notIn: ["CANCELLED", "DONE"] } : { not: "CANCELLED" },
      ...(branchId ? { car: { branchId } } : {}),
    },
    orderBy: { [dateField]: "asc" },
    include: { car: { include: { branch: true } }, user: true },
  });

  res.json(contracts.map(serializeScheduleRow));
});

module.exports = {
  getContractsByPage,
  createContract,
  getAvailableCarsAdmin,
  deleteContract,
  getAdminSchedule,
  returnContract,
  cancelContract,
  reopenContract,
};
