const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { parseFrontendDateTime, round2 } = require("../../lib/dates");
const { checkAvailability } = require("../../lib/availability");
const { serializeContract, serializeUser } = require("../../lib/serializers");
const asyncHandler = require("../../middleware/async-handler");
const { customerTotals } = require("../users/customer-fields");
const { CAR_INCLUDE } = require("./contracts.shared");
const { num, pickContractFields, rentalTerm } = require("./contract-fields");
const { recomputeContractFinancials, contractUnitPrice } = require("./contract-financials");
const { kbsStamp } = require("./kbs");

// The contract detail screen's write paths: patch the contract, read it back
// in full, extend the drop-off, and issue the invoice.

const updateContract = asyncHandler(async (req, res) => {
  const { carId, contractId } = req.query;
  const { pickUpTime, dropOffTime, pickUpLocation, dropOffLocation } = req.body;
  // `status` is owned by the lifecycle endpoints (return / cancel / reopen), not
  // the generic patch — an edit-save never changes it.

  const existing = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!existing) throw new HttpError(404, "Contract not found.");

  const parsedPickUp = parseFrontendDateTime(pickUpTime);
  const parsedDropOff = parseFrontendDateTime(dropOffTime);
  const targetCarId = carId || existing.carId;

  // Validates the date range and that the vehicle exists.
  await checkAvailability(targetCarId, parsedPickUp, parsedDropOff, {
    excludeContractId: existing.id,
  });

  const contractFields = pickContractFields(req.body);

  // KABİS filing / release: stamp the acting admin on each null -> set
  // transition; a release needs a filing; clearing the filing clears the release.
  if ("kbsNotifiedAt" in contractFields) {
    const nowFiled = !!contractFields.kbsNotifiedAt;
    if (nowFiled && !existing.kbsNotifiedAt) {
      contractFields.kbsNotifiedBy = kbsStamp(req.user);
    } else if (!nowFiled) {
      contractFields.kbsNotifiedBy = null;
      contractFields.kbsReleasedAt = null;
      contractFields.kbsReleasedBy = null;
    }
  }
  if ("kbsReleasedAt" in contractFields) {
    const nowReleased = !!contractFields.kbsReleasedAt;
    const filed =
      "kbsNotifiedAt" in contractFields ? contractFields.kbsNotifiedAt : existing.kbsNotifiedAt;
    if (nowReleased && !filed) {
      throw new HttpError(400, "KABİS kaydı düşülmeden önce bildirim yapılmalı.");
    }
    if (nowReleased && !existing.kbsReleasedAt) {
      contractFields.kbsReleasedBy = kbsStamp(req.user);
    } else if (!nowReleased) {
      contractFields.kbsReleasedBy = null;
    }
  }

  await prisma.contract.update({
    where: { id: existing.id },
    data: {
      carId: targetCarId,
      pickUpLocation,
      dropOffLocation,
      pickUpTime: parsedPickUp,
      dropOffTime: parsedDropOff,
      ...contractFields,
    },
  });

  // recompute owns Contract.totalPrice and the ledger debit — base rental at the
  // current rate + Σ extension amounts. The client refetches the full contract
  // via getContractByIdAdmin after save.
  await recomputeContractFinancials(existing.id);

  const contract = await prisma.contract.findUnique({
    where: { id: existing.id },
    include: { ...CAR_INCLUDE, extensions: { orderBy: { createdAt: "desc" } } },
  });
  res.json(serializeContract(contract));
});

const getContractByIdAdmin = asyncHandler(async (req, res) => {
  const contract = await prisma.contract.findUnique({
    where: { id: req.params.id },
    include: {
      ...CAR_INCLUDE,
      // Full customer record so the edit screen's customer tab shows the same
      // detail as create mode (type / tax no / address / balance …).
      user: true,
      referenceUser: { select: { id: true, firstName: true, lastName: true, companyTitle: true, customerType: true } },
      corporate: true,
      extensions: { orderBy: { createdAt: "desc" } },
      vehicleChanges: { orderBy: { changeDate: "desc" } },
      invoices: { orderBy: { issuedAt: "desc" } },
      // Same source the contract list sums for its Bakiye column (see
      // contracts.admin.controller.js getContractsByPage) — a payment recorded
      // from the Finans/Cari screen and tagged to this contract counts here too,
      // not just ones entered on this screen's own Tahsilat tab.
      ledgerEntries: {
        where: { category: "PAYMENT", direction: "CREDIT" },
        select: { amount: true },
      },
    },
  });
  if (!contract) throw new HttpError(404, "Contract not found.");

  const { user, referenceUser, ledgerEntries, ...rest } = contract;
  const totals = user ? await customerTotals([user.id]) : {};
  const t = totals[contract.userId] || { debit: 0, credit: 0 };

  res.json({
    ...serializeContract(rest),
    carId: contract.carId,
    userId: contract.userId,
    collected: ledgerEntries.reduce((s, e) => s + e.amount, 0),
    customer: user
      ? { ...serializeUser(user), debit: t.debit, credit: t.credit, balance: t.credit - t.debit }
      : null,
    referenceUserId: contract.referenceUserId,
    referenceUser: referenceUser || null,
    reservationId: contract.reservationId,
  });
});

// An extension pushes the drop-off out and adds one flat, operator-priced line
// to the contract total — nothing is re-priced. The amount is entered NET (the
// system adds VAT for MONTHLY); a blank amount auto-fills monthlyPrice × months
// (min 1 month regardless of days) for MONTHLY, dailyPrice × days for DAILY.
const extendContract = asyncHandler(async (req, res) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
  if (!contract) throw new HttpError(404, "Contract not found.");

  const newDropOff = parseFrontendDateTime(req.body.newDropOff);
  if (!newDropOff || newDropOff <= contract.dropOffTime) {
    throw new HttpError(400, "New drop-off must be after the current drop-off.");
  }

  const vatRate = contract.vatRate ?? 20;
  const isMonthly = contract.rentalType === "MONTHLY";
  const { months, days } = rentalTerm(contract.dropOffTime, newDropOff);
  const chargeMonths = isMonthly ? Math.max(1, months) : 0;

  const typedNet = num(req.body.extraAmount);
  const autoNet = isMonthly
    ? round2((contract.monthlyPrice || 0) * chargeMonths)
    : round2((contract.dailyPrice || 0) * days);
  const extraNet = typedNet != null ? typedNet : autoNet;
  const extraGross = isMonthly ? round2(extraNet * (1 + vatRate / 100)) : round2(extraNet);

  await prisma.$transaction(async (tx) => {
    await tx.contractExtension.create({
      data: {
        contractId: contract.id,
        previousDropOff: contract.dropOffTime,
        newDropOff,
        extraDays: days,
        months: chargeMonths,
        extraAmount: extraGross,
        extraAmountNet: extraNet,
        note: req.body.note || null,
      },
    });
    await tx.contract.update({ where: { id: contract.id }, data: { dropOffTime: newDropOff } });
    await recomputeContractFinancials(contract.id, tx);
  });

  const updated = await prisma.contract.findUnique({
    where: { id: contract.id },
    include: { ...CAR_INCLUDE, extensions: { orderBy: { createdAt: "desc" } } },
  });
  res.json(serializeContract(updated));
});

// Undo an extension: drop the row, roll the drop-off back to the latest
// remaining extension (or the deleted one's previousDropOff if it was the last),
// and re-total. Any extension can be removed.
const deleteExtension = asyncHandler(async (req, res) => {
  const { id, extensionId } = req.params;
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: { extensions: true },
  });
  if (!contract) throw new HttpError(404, "Contract not found.");
  const target = contract.extensions.find((e) => e.id === extensionId);
  if (!target) throw new HttpError(404, "Extension not found.");

  const remaining = contract.extensions.filter((e) => e.id !== extensionId);
  const newDropOff = remaining.length
    ? remaining.reduce((max, e) => (e.newDropOff > max ? e.newDropOff : max), remaining[0].newDropOff)
    : target.previousDropOff;

  await prisma.$transaction(async (tx) => {
    await tx.contractExtension.delete({ where: { id: extensionId } });
    await tx.contract.update({ where: { id }, data: { dropOffTime: newDropOff } });
    await recomputeContractFinancials(id, tx);
  });

  const updated = await prisma.contract.findUnique({
    where: { id },
    include: { ...CAR_INCLUDE, extensions: { orderBy: { createdAt: "desc" } } },
  });
  res.json(serializeContract(updated));
});

// Mid-contract vehicle swap: only accepts a car that's actually free for
// [changeDate, dropOffTime), logs a snapshot record, then repoints carId.
const changeVehicle = asyncHandler(async (req, res) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id } });
  if (!contract) throw new HttpError(404, "Contract not found.");

  const { newCarId, note, returnKm, returnFuelEighths, newCarKm, newCarFuelEighths } = req.body;
  const changeDate = parseFrontendDateTime(req.body.changeDate);
  if (!newCarId) throw new HttpError(400, "Yeni araç seçilmedi.");
  if (!changeDate) throw new HttpError(400, "Geçersiz değişiklik tarihi.");
  if (changeDate < contract.pickUpTime || changeDate >= contract.dropOffTime) {
    throw new HttpError(400, "Değişiklik tarihi kontrat aralığında olmalıdır.");
  }
  if (newCarId === contract.carId) {
    throw new HttpError(400, "Bu araç zaten kontrata atanmış.");
  }

  const { available, vehicle: newVehicle } = await checkAvailability(newCarId, changeDate, contract.dropOffTime, {
    excludeContractId: contract.id,
  });
  if (!available) throw new HttpError(409, "Bu araç seçili tarih aralığında müsait değil.");

  const previousVehicle = await prisma.vehicle.findUnique({ where: { id: contract.carId } });
  const label = (v, fallbackId) => (v ? `${v.brand} ${v.model} — ${v.licensePlate}` : fallbackId);

  // The left card's hand-over odometer/fuel track whichever car is currently
  // assigned — once swapped, they should read the new car's figures, not the
  // original car's (now stale) snapshot.
  const parsedNewCarKm = num(newCarKm);
  const parsedNewCarFuelEighths = num(newCarFuelEighths);
  const contractUpdate = { carId: newCarId };
  if (parsedNewCarKm !== null) contractUpdate.pickUpKm = parsedNewCarKm;
  if (parsedNewCarFuelEighths !== null) contractUpdate.pickUpFuelEighths = parsedNewCarFuelEighths;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.contractVehicleChange.create({
      data: {
        contractId: contract.id,
        changeDate,
        previousCarId: contract.carId,
        previousCarLabel: label(previousVehicle, contract.carId),
        returnKm: num(returnKm),
        returnFuelEighths: num(returnFuelEighths),
        newCarId,
        newCarLabel: label(newVehicle, newCarId),
        newCarKm: parsedNewCarKm,
        newCarFuelEighths: parsedNewCarFuelEighths,
        note: note || null,
      },
    });
    return tx.contract.update({
      where: { id: contract.id },
      data: contractUpdate,
      include: CAR_INCLUDE,
    });
  });

  res.json(serializeContract(updated));
});

// gross is VAT-inclusive; split it into net + tax at the contract's rate.
const splitVat = (gross, rate) => {
  const net = round2(gross / (1 + (rate ?? 20) / 100));
  return { netAmount: net, taxAmount: round2(gross - net), grossAmount: round2(gross) };
};

const nextInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const countThisYear = await prisma.invoice.count({
    where: { createdAt: { gte: new Date(`${year}-01-01T00:00:00Z`) } },
  });
  return `RW-${year}-${String(countThisYear + 1).padStart(5, "0")}`;
};

const parseIssuedAt = (value) => {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) throw new HttpError(400, "Invalid invoice date.");
  return d;
};

const P2002 = (err) => {
  if (err.code === "P2002") {
    throw new HttpError(409, "That invoice number is already in use.", "INVOICE_NUMBER_TAKEN");
  }
  throw err;
};

// A contract can carry several invoices (partial billing, corrections, extra
// charges). Each row's number is globally unique; a blank number auto-assigns
// RW-YYYY-NNNNN. Amounts are entered VAT-inclusive.
const listInvoices = asyncHandler(async (req, res) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!contract) throw new HttpError(404, "Contract not found.");
  const invoices = await prisma.invoice.findMany({
    where: { contractId: contract.id },
    orderBy: { issuedAt: "desc" },
  });
  res.json(invoices);
});

const createInvoice = asyncHandler(async (req, res) => {
  const contract = await prisma.contract.findUnique({
    where: { id: req.params.id },
    include: {
      corporate: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          customerType: true,
          companyTitle: true,
          nationalId: true,
        },
      },
    },
  });
  if (!contract) throw new HttpError(404, "Contract not found.");

  const number = (req.body.number || "").trim() || (await nextInvoiceNumber());
  const issuedAt = parseIssuedAt(req.body.issuedAt);

  const requestedGross = num(req.body.grossAmount);
  const gross = requestedGross != null ? requestedGross : contract.totalPrice || 0;
  if (gross < 0) throw new HttpError(400, "Invalid invoice amount.");

  // Bill to: the reference cari if one is set, else the corporate customer's
  // registered title, else the individual's name. Corporate customers keep
  // their 10-digit VKN (stored in nationalId) as the invoice tax no.
  const corporateCustomer = contract.user.customerType === "Kurumsal";
  const defaultTitle =
    contract.corporate?.title ||
    (corporateCustomer && contract.user.companyTitle) ||
    `${contract.user.firstName} ${contract.user.lastName}`.trim();
  const defaultTaxNo =
    contract.corporate?.taxNo || (corporateCustomer ? contract.user.nationalId : null) || null;

  let invoice;
  try {
    invoice = await prisma.invoice.create({
      data: {
        contractId: contract.id,
        number,
        issuedAt,
        ...splitVat(gross, contract.vatRate),
        customerTitle: (req.body.customerTitle || "").trim() || defaultTitle,
        taxNo: (req.body.taxNo || "").trim() || defaultTaxNo,
        note: req.body.note || null,
      },
    });
  } catch (err) {
    P2002(err);
  }
  res.status(201).json(invoice);
});

const updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.invoiceId },
    include: { contract: { select: { vatRate: true } } },
  });
  if (!invoice) throw new HttpError(404, "Invoice not found.");

  const data = {};
  if (req.body.number !== undefined) {
    const number = (req.body.number || "").trim();
    if (!number) throw new HttpError(400, "Invoice number cannot be empty.");
    data.number = number;
  }
  if (req.body.issuedAt !== undefined) data.issuedAt = parseIssuedAt(req.body.issuedAt);
  if (req.body.grossAmount !== undefined) {
    const gross = num(req.body.grossAmount);
    if (gross == null || gross < 0) throw new HttpError(400, "Invalid invoice amount.");
    Object.assign(data, splitVat(gross, invoice.contract.vatRate));
  }
  if (req.body.customerTitle !== undefined) data.customerTitle = (req.body.customerTitle || "").trim() || null;
  if (req.body.taxNo !== undefined) data.taxNo = (req.body.taxNo || "").trim() || null;
  if (req.body.note !== undefined) data.note = req.body.note || null;

  let updated;
  try {
    updated = await prisma.invoice.update({ where: { id: invoice.id }, data });
  } catch (err) {
    P2002(err);
  }
  res.json(updated);
});

const deleteInvoice = asyncHandler(async (req, res) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.invoiceId } });
  if (!invoice) throw new HttpError(404, "Invoice not found.");
  await prisma.invoice.delete({ where: { id: invoice.id } });
  res.json({ ok: true });
});

module.exports = {
  updateContract,
  getContractByIdAdmin,
  extendContract,
  deleteExtension,
  changeVehicle,
  listInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
};
