const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { parseFrontendDateTime, resolveWindow } = require("../../lib/dates");
const {
  serializeScheduleRow,
  serializeVehicle,
  serializeHgsPendingRow,
  serializeInvoicePendingRow,
  serializeKbsPendingRow,
} = require("../../lib/serializers");
const { parsePageParams, buildPageResponse } = require("../../lib/pagination");
const asyncHandler = require("../../middleware/async-handler");
const { ALLOWED_SORT_FIELDS } = require("./contracts.shared");
const { nextContractNo, num, hgsRangesCoverPeriod } = require("./contract-fields");
const { recomputeContractFinancials } = require("./contract-financials");
const { round2 } = require("../../lib/dates");
const { kbsStamp, kbsBlocksClose } = require("./kbs");
const { syncContractDebit, voidContractLedger, restoreContractLedger } = require("../../lib/ledger");
const { getBusyVehicleIds } = require("../../lib/availability");
const { loadModelImageMap } = require("../vehicles/vehicles.shared");
const { readSettings } = require("../settings/settings.controller");

const RETURN_CHARGE_CATEGORIES = [
  "KM_EXCESS",
  "FUEL",
  "ONE_WAY",
  "DAMAGE",
  "ROADSIDE",
  "CLEANING",
  "HGS_OGS",
  "DEPOSIT",
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
        // Payment credits, wherever they were recorded from: the contract's own
        // Tahsilat tab (ContractPayment, mirrored here as AUTO_PAYMENT) AND a
        // manual collection tagged to this contract from the Finans/Cari screen
        // (source MANUAL). Summing the ledger instead of Contract.payments is
        // what makes a Finance-side tahsilat show up in this list's balance.
        ledgerEntries: {
          where: { category: "PAYMENT", direction: "CREDIT" },
          select: { amount: true },
        },
        extensions: { select: { extraDays: true } },
      },
    }),
    prisma.contract.count({ where }),
  ]);

  const dayCount = (r) =>
    Math.max(1, Math.ceil((r.dropOffTime.getTime() - r.pickUpTime.getTime()) / 86400000));

  // Extra calendar days added by extensions.
  const extensionDays = (r) => r.extensions.reduce((sum, e) => sum + (e.extraDays || 0), 0);

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
        collected: r.ledgerEntries.reduce((s, e) => s + e.amount, 0),
        dayCount: dayCount(r),
        extensionDays: extensionDays(r),
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

// Compact contract list for one customer — feeds the "attribute this collection
// to a contract" picker on the Finans/Cari tahsilat form. Matches either the
// primary customer or the reference customer (corporate bookings can be paid
// by either).
const getContractsByUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const contracts = await prisma.contract.findMany({
    where: { OR: [{ userId }, { referenceUserId: userId }] },
    orderBy: { pickUpTime: "desc" },
    take: 100,
    select: {
      id: true,
      contractNo: true,
      status: true,
      pickUpTime: true,
      dropOffTime: true,
      returnedAt: true,
      totalPrice: true,
      car: { select: { brand: true, model: true, licensePlate: true } },
    },
  });
  res.json(
    contracts.map((c) => ({
      id: c.id,
      contractNo: c.contractNo,
      status: c.status,
      pickUpTime: c.pickUpTime,
      dropOffTime: c.dropOffTime,
      returnedAt: c.returnedAt,
      totalPrice: c.totalPrice,
      vehicle: c.car ? `${c.car.brand} ${c.car.model}`.trim() : null,
      plate: c.car?.licensePlate || null,
    }))
  );
});

// Full rental history for one vehicle — every contract ever opened against
// it, open or closed, newest first. Shown on the vehicle detail page.
const getContractsByVehicle = asyncHandler(async (req, res) => {
  const { vehicleId } = req.params;
  const contracts = await prisma.contract.findMany({
    where: { carId: vehicleId },
    orderBy: { pickUpTime: "desc" },
    select: {
      id: true,
      contractNo: true,
      status: true,
      pickUpTime: true,
      dropOffTime: true,
      returnedAt: true,
      totalPrice: true,
      user: { select: { firstName: true, lastName: true, companyTitle: true } },
      corporate: { select: { title: true } },
    },
  });
  res.json(
    contracts.map((c) => ({
      id: c.id,
      contractNo: c.contractNo,
      status: c.status,
      pickUpTime: c.pickUpTime,
      dropOffTime: c.dropOffTime,
      returnedAt: c.returnedAt,
      totalPrice: c.totalPrice,
      customerName:
        c.corporate?.title ||
        c.user?.companyTitle ||
        `${c.user?.firstName || ""} ${c.user?.lastName || ""}`.trim() ||
        null,
    }))
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

  const [cars, modelImages] = await Promise.all([
    prisma.vehicle.findMany({
      where: { outOfService: false, soldAt: null },
      orderBy: [{ brand: "asc" }, { model: "asc" }],
      include: { images: { orderBy: { createdAt: "asc" } }, branch: true },
    }),
    loadModelImageMap(),
  ]);

  res.json(
    cars.filter((car) => !busy.has(car.id)).map((car) => serializeVehicle(car, modelImages))
  );
});

const deleteContract = asyncHandler(async (req, res) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
  if (!contract) throw new HttpError(404, "Contract not found.");

  // LedgerEntry.contract is SetNull, so a bare delete would leave the contract's
  // auto RENTAL debit and PAYMENT credits behind as orphan rows that still weigh
  // on the customer's cari balance. Clear them together with the contract.
  await prisma.$transaction([
    prisma.ledgerEntry.deleteMany({ where: { contractId: contract.id } }),
    prisma.contract.delete({ where: { id: contract.id } }),
  ]);
  res.json({ message: "Contract deleted." });
});

// Lifecycle actions from the contract detail bar: "Araç Teslim Al" closes the
// contract (DONE), "Kontratı İptal Et" voids it (CANCELLED — frees the vehicle,
// drops out of customer balance), "Geri Aç" reopens it (CREATED, see below).
const setContractStatus = (status) =>
  asyncHandler(async (req, res) => {
    const existing = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Contract not found.");

    // Status change + its ledger effect move together — a cancel must never
    // leave the RENTAL debit behind, a reopen-to-CREATED must never miss it.
    const contract = await prisma.$transaction(async (tx) => {
      const updated = await tx.contract.update({
        where: { id: existing.id },
        data: { status },
      });
      if (status === "CANCELLED") await voidContractLedger(updated.id, tx);
      else await syncContractDebit(updated, tx);
      return updated;
    });

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
  // Mandatory: this is the only moment the vehicle's own currentKm/
  // currentFuelEighths get refreshed (see the write-back below), which the
  // *next* contract's pick-up fields prefill from — skipping it here would
  // silently leave the car's record stale forever.
  if (returnKm == null || returnFuelEighths == null) {
    throw new HttpError(
      400,
      "Kontratı kapatmak için dönüş km ve yakıt seviyesi girilmelidir.",
      "RETURN_DATA_REQUIRED"
    );
  }
  if (existing.pickUpKm != null && returnKm < existing.pickUpKm) {
    throw new HttpError(400, "Dönüş km alış km'sinden küçük olamaz.", "RETURN_KM_BELOW_PICKUP");
  }
  if (returnFuelEighths < 0 || returnFuelEighths > 8) {
    throw new HttpError(400, "Yakıt göstergesi 0-8 aralığında olmalıdır.");
  }
  // The operator picks the actual hand-back moment (defaults to "now" on the
  // modal, but stays editable for a return processed after the fact) — this
  // is what the HGS period and every other "kiralanan gün sayısı" downstream
  // of returnedAt reads, so a silent server-side `new Date()` here used to
  // make that day count drift from when the car actually came back.
  const returnedAt = req.body?.returnedAt ? parseFrontendDateTime(req.body.returnedAt) : new Date();
  if (!returnedAt) throw new HttpError(400, "Teslim tarihi geçersiz.");
  if (returnedAt < existing.pickUpTime) {
    throw new HttpError(400, "Teslim tarihi alış tarihinden önce olamaz.");
  }
  const charges = sanitizeReturnCharges(req.body?.charges);

  // Early return only: the operator may hand the car back before the
  // contracted drop-off date (frontend warns and re-confirms before ever
  // sending this) — dropOffTime syncs to the actual hand-back moment, and
  // (no extension row is created) recomputeContractFinancials then simply
  // re-prices the base rental off that shorter, real window — the customer
  // is billed for the days actually used, not the originally reserved span.
  // A LATE return is deliberately NOT synced here — that's the operator's
  // own call via the Uzatma tab (a real, priced extension), not an
  // automatic side effect of closing the contract.
  // Compared at day precision, not exact timestamp — a return processed a
  // few minutes off the scheduled time (the normal case) shouldn't trigger
  // this; only an actually earlier calendar date should.
  const isoDay = (d) => d.toISOString().slice(0, 10);
  const isEarlyReturn = isoDay(returnedAt) < isoDay(existing.dropOffTime);

  await prisma.$transaction(async (tx) => {
    // Update first — takes a row lock so a duplicate/concurrent return blocks
    // until this one commits, then replays the replace cleanly.
    await tx.contract.update({
      where: { id: existing.id },
      data: {
        status: "DONE",
        returnKm,
        returnFuelEighths,
        returnedAt,
        ...(isEarlyReturn ? { dropOffTime: returnedAt } : {}),
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
    // The vehicle's own record should reflect its latest known odometer/fuel
    // once it's handed back — the next contract's pick-up fields prefill
    // straight from this (contracts/details/page.jsx `selectedCar.currentKm`).
    // Always runs now: returnKm/returnFuelEighths are required above.
    await tx.vehicle.update({
      where: { id: existing.carId },
      data: { currentKm: returnKm, currentFuelEighths: returnFuelEighths },
    });
  });

  res.json({ id: existing.id, status: "DONE" });
});

const cancelContract = setContractStatus("CANCELLED");

// Admin dashboard "Returns"/"Departures" tables: contracts due by the end of
// a day window from now. No lower bound on purpose — a car that was due
// back three days ago and never came in is still due, and should keep
// showing (now visibly overdue — see ScheduleTable's row--overdue class)
// instead of quietly falling out of every window once its date passes.
// Always excludes CANCELLED; optionally excludes DONE too (a genuinely
// completed return is the only thing that should ever drop off this list).
const getAdminSchedule = asyncHandler(async (req, res) => {
  const { type = "returns", window = "7", excludeCompleted, branchId } = req.query;
  const dateField = type === "departures" ? "pickUpTime" : "dropOffTime";
  const { to } = resolveWindow(window);

  const contracts = await prisma.contract.findMany({
    where: {
      [dateField]: { lte: to },
      status: excludeCompleted === "true" ? { notIn: ["CANCELLED", "DONE"] } : { not: "CANCELLED" },
      ...(branchId ? { car: { branchId } } : {}),
    },
    orderBy: { [dateField]: "asc" },
    include: { car: { include: { branch: true } }, user: true },
  });

  res.json(contracts.map(serializeScheduleRow));
});

// Admin dashboard alert bar: contracts that have been closed (DONE) but whose
// HGS/OGS toll check is not complete — hgsStatus is derived from the check log
// and only reads "CHECKED" once the queried ranges span the whole rental.
// Oldest-closed first so the longest-outstanding ones sit at the top.
const getHgsPendingContracts = asyncHandler(async (req, res) => {
  const { branchId } = req.query;
  const contracts = await prisma.contract.findMany({
    where: {
      status: "DONE",
      OR: [{ hgsStatus: null }, { hgsStatus: { not: "CHECKED" } }],
      ...(branchId ? { car: { branchId } } : {}),
    },
    orderBy: [{ returnedAt: "asc" }, { dropOffTime: "asc" }],
    include: { car: { include: { branch: true } }, user: true },
  });

  res.json(contracts.map(serializeHgsPendingRow));
});

// Contracts missing an invoice that covers the days actually rented:
//   - closed (DONE) contracts with zero Invoice rows at all, same as before.
//   - still-open MONTHLY contracts (not cancelled) whose logged invoice
//     periods don't reach today yet — a long-running corporate rental used
//     to hide from this panel entirely until it was finally returned, which
//     could be months away. DAILY contracts are invoiced once at return, so
//     an open one isn't "missing" an invoice yet — that's exactly the first
//     bullet's job once it closes.
// Coverage is the same union-of-ranges test the HGS panel runs against its
// check log, run here against Invoice.periodFrom/periodTo instead.
const getInvoicePendingContracts = asyncHandler(async (req, res) => {
  const { branchId } = req.query;
  const branchWhere = branchId ? { car: { branchId } } : {};
  const rowInclude = { car: { include: { branch: true } }, user: true };

  const [closedNoInvoice, openMonthly] = await Promise.all([
    prisma.contract.findMany({
      where: { status: "DONE", invoices: { none: {} }, ...branchWhere },
      include: rowInclude,
    }),
    prisma.contract.findMany({
      where: { status: { notIn: ["CANCELLED", "DONE"] }, rentalType: "MONTHLY", ...branchWhere },
      include: { ...rowInclude, invoices: { select: { periodFrom: true, periodTo: true } } },
    }),
  ]);

  const now = new Date();
  const openPending = openMonthly.filter((c) => {
    // periodFrom/periodTo are optional on Invoice (an ad-hoc one may carry
    // neither) — drop those before the coverage check, since isoDay(null)
    // resolves to the epoch rather than "no claim" and would otherwise poison
    // the whole union with a bogus 1970 interval that breaks the real ones.
    const dated = c.invoices.filter((i) => i.periodFrom && i.periodTo);
    return !hgsRangesCoverPeriod(
      dated.map((i) => ({ rangeFrom: i.periodFrom, rangeTo: i.periodTo })),
      c.pickUpTime,
      now
    );
  });

  const rows = [...closedNoInvoice, ...openPending].sort(
    (a, b) => new Date(a.returnedAt || a.pickUpTime) - new Date(b.returnedAt || b.pickUpTime)
  );

  res.json(rows.map(serializeInvoicePendingRow));
});

// Contracts never reported to KABİS (Kimlik Bildirme Sistemi) — open or
// already closed, but not cancelled (a cancelled rental never happened, so
// there's nothing to report). Filing is meant to happen around pickup, so
// this surfaces both states rather than gating on status: "DONE" like the
// HGS/invoice panels — oldest pick-up first, the longest-outstanding ones.
const getKbsPendingContracts = asyncHandler(async (req, res) => {
  const { branchId } = req.query;
  const contracts = await prisma.contract.findMany({
    where: {
      status: { not: "CANCELLED" },
      kbsNotifiedAt: null,
      ...(branchId ? { car: { branchId } } : {}),
    },
    orderBy: [{ pickUpTime: "asc" }],
    include: { car: { include: { branch: true } }, user: true },
  });

  res.json(contracts.map(serializeKbsPendingRow));
});

module.exports = {
  getContractsByPage,
  getContractsByUser,
  getContractsByVehicle,
  createContract,
  getAvailableCarsAdmin,
  deleteContract,
  getAdminSchedule,
  getHgsPendingContracts,
  getInvoicePendingContracts,
  getKbsPendingContracts,
  returnContract,
  cancelContract,
  reopenContract,
};
