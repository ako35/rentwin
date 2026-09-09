import moment from "moment/moment";
import { utils } from "../../../../utils";
import { services } from "../../../../services";

// Every contract-screen customer dropdown is fed by the same query: all
// Customer-role users, name-sorted, first 300.
export const fetchCustomers = () =>
  services.user
    .getUsersByPage(0, 300, "firstName", "ASC", { role: "Customer" })
    .then((list) => list?.content || []);

// Blank contract form — the shape formik is initialised with.
export const EMPTY_CONTRACT = {
  pickUpLocation: "", dropOffLocation: "", pickUpDate: "", pickUpTime: "",
  dropOffDate: "", dropOffTime: "", carId: "", status: "", userId: "",
  contractNo: "", customerNote: "", adminNote: "", flightNo: "",
  pickUpKm: "", pickUpFuelEighths: "",
  returnKm: "", returnFuelEighths: "", returnedAt: "",
  rentalType: "DAILY", dailyPrice: "", monthlyPrice: "", returnExtraAmount: "",
  deposit: "", kmLimit: "", unlimitedKm: false,
  dailyKmLimit: 300, monthlyKmLimit: "", kmOverageFee: "", fuelFeePerEighth: "",
  vatRate: 20,
  referenceUserId: "",
  kbsNotifiedAt: "", kbsNotifiedBy: "", kbsReleasedAt: "", kbsReleasedBy: "",
  hgsStatus: "",
};

// Derived KABİS state from the contract form values.
// pending  — not filed
// reported — filed, not yet released (blocks contract close)
// released — filed and released (çıkış bildirimi yapıldı)
export const kbsStatus = (v) => {
  if (v.kbsReleasedAt) return "released";
  if (v.kbsNotifiedAt) return "reported";
  return "pending";
};

// Blank "Yeni Müşteri" quick-add form.
export const EMPTY_NEW_CUST = {
  customerType: "Bireysel", companyTitle: "", taxOffice: "",
  firstName: "", lastName: "", nationalId: "",
  email: "", phoneNumber: "", address: "", city: "", district: "",
};

export const formatMoney = (value, lang) =>
  Number(value || 0).toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Display name for a customer row: company title, else "First Last".
export const custLabel = (u) => (u.companyTitle || `${u.firstName} ${u.lastName}`).trim();

// Typeahead filter shared by the customer and reference-account pickers.
export const matchCustomers = (customers, query, { excludeId, keepId } = {}) => {
  const q = query.trim().toLowerCase();
  return customers
    .filter((u) => {
      if (excludeId && u.id === excludeId) return false;
      if (!q || u.id === keepId) return true;
      return [u.firstName, u.lastName, u.companyTitle, u.email, u.nationalId, u.phoneNumber]
        .some((f) => (f || "").toLowerCase().includes(q));
    })
    .slice(0, 25);
};

// Whole rental days, minimum one, from the form's date/time fields.
export const computeBillableDays = ({ pickUpDate, pickUpTime, dropOffDate, dropOffTime }) => {
  if (!pickUpDate || !dropOffDate) return 1;
  const start = moment(`${pickUpDate} ${pickUpTime || "00:00"}`);
  const end = moment(`${dropOffDate} ${dropOffTime || "00:00"}`);
  return Math.max(1, Math.ceil(end.diff(start, "hours") / 24));
};

const round2 = (n) => Math.round(n * 100) / 100;
const numOr = (x) => Number(x) || 0;

// Whole calendar months + leftover ("kıst") days between two YYYY-MM-DD dates,
// compared by calendar date only. Mirrors backend contract-fields.rentalTerm
// (an 8th->8th window is exactly N months, 0 kıst days). moment .add(n,"month")
// clamps to the month end, like the backend.
const termBetween = (startDate, endDate) => {
  const s = moment(startDate, "YYYY-MM-DD");
  const e = moment(endDate, "YYYY-MM-DD");
  if (!s.isValid() || !e.isValid() || e.isSameOrBefore(s, "day")) return { months: 0, days: 1 };
  let months = 0;
  while (s.clone().add(months + 1, "month").isSameOrBefore(e, "day")) months += 1;
  const cursor = s.clone().add(months, "month");
  let days = e.diff(cursor, "days");
  days = months === 0 ? Math.max(1, days) : Math.max(0, days);
  return { months, days };
};

// UTC calendar date of an ISO datetime — matches the backend's UTC date parts.
const utcDate = (iso) => moment.utc(iso).format("YYYY-MM-DD");

export const computeRentalTerm = ({ pickUpDate, dropOffDate }) => {
  if (!pickUpDate || !dropOffDate) return { months: 0, days: 1 };
  return termBetween(pickUpDate, dropOffDate);
};

// Live pricing card figures.
//   base rental — the window [pick-up, <drop-off before the first extension>]:
//     DAILY   : net = gross = billableDays x dailyPrice        (VAT-inclusive)
//     MONTHLY : net  = months x monthlyPrice + kıst x (monthlyPrice / 30)
//               gross = net x (1 + vatRate/100)                (VAT on top)
//   + Σ extension.extraAmount (flat operator-priced lines) + returnExtraAmount
// Mirrors backend contract-financials.recomputeContractFinancials.
export const computePricing = (values, billableDays, extensions = []) => {
  const n = numOr;
  const isMonthly = values.rentalType === "MONTHLY";
  const vatRate = n(values.vatRate) || 20;

  // The base window ends where the drop-off was before the first extension.
  const baseEndDate = extensions.length
    ? extensions
        .map((e) => utcDate(e.previousDropOff))
        .reduce((min, d) => (d < min ? d : min))
    : values.dropOffDate;

  let rentalNet;
  let rentalGross;
  let term = { months: 0, days: billableDays };
  if (isMonthly) {
    term = termBetween(values.pickUpDate, baseEndDate);
    const m = n(values.monthlyPrice);
    rentalNet = round2(term.months * m + term.days * round2(m / 30));
    rentalGross = round2(rentalNet * (1 + vatRate / 100));
  } else {
    rentalNet = round2(n(values.dailyPrice) * billableDays);
    rentalGross = rentalNet;
  }
  const vat = round2(rentalGross - rentalNet);

  const extTotal = round2(extensions.reduce((s, e) => s + n(e.extraAmount), 0));
  const extras = n(values.returnExtraAmount);
  const total = round2(rentalGross + extTotal + extras);

  return {
    isMonthly,
    months: term.months,
    days: term.days,
    vatRate,
    rentalNet,
    vat,
    rentalGross,
    extTotal,
    extCount: extensions.length,
    extras,
    total,
  };
};

// Km allowance for the whole rental — the stricter of the daily and monthly cap.
// A blank limit is no cap on that axis; unlimitedKm or both blank -> Infinity.
// In MONTHLY rental mode the monthly cap follows the same month + kıst-day
// breakdown as the price. Mirrors backend contract-fields.computeAllowedKm.
export const computeAllowedKm = (values, contractedDays) => {
  if (values.unlimitedKm) return Infinity;
  const daily = Number(values.dailyKmLimit) || 0;
  const monthly = Number(values.monthlyKmLimit) || 0;

  if (values.rentalType === "MONTHLY") {
    const { months, days } = computeRentalTerm(values);
    const dailyCap = daily > 0 ? daily * (months * 30 + days) : Infinity;
    const monthlyCap = monthly > 0 ? months * monthly + Math.ceil(days * (monthly / 30)) : Infinity;
    return Math.min(dailyCap, monthlyCap);
  }

  const dailyCap = daily > 0 ? daily * contractedDays : Infinity;
  const monthlyCap = monthly > 0 ? monthly * Math.ceil(contractedDays / 30) : Infinity;
  return Math.min(dailyCap, monthlyCap);
};

// Return-time overage: excess km × ₺/km and missing fuel eighths × ₺/(1/8).
// `readings` carries the return modal's live inputs.
export const computeReturnOverage = (values, readings) => {
  const { pickUpKm, returnKm, pickUpFuelEighths, returnFuelEighths, contractedDays } = readings;
  const allowedKm = computeAllowedKm(values, contractedDays);
  const usedKm = Math.max(0, (Number(returnKm) || 0) - (Number(pickUpKm) || 0));
  const excessKm =
    returnKm === "" || returnKm == null || !Number.isFinite(allowedKm)
      ? 0
      : Math.max(0, usedKm - allowedKm);
  const kmCharge = round2(excessKm * (Number(values.kmOverageFee) || 0));
  const missingEighths = Math.max(
    0,
    (Number(pickUpFuelEighths) || 0) - (Number(returnFuelEighths) || 0)
  );
  const fuelCharge = round2(missingEighths * (Number(values.fuelFeePerEighth) || 0));
  return { allowedKm, usedKm, excessKm, kmCharge, missingEighths, fuelCharge };
};

// True once the union of the logged HGS query ranges spans the whole rental
// period (day precision). The HGS check status is derived from this, never set
// by hand. Mirrors backend contract-fields.hgsRangesCoverPeriod.
export const hgsRangesCoverPeriod = (rows, startStr, endStr) => {
  if (!startStr || !endStr || !Array.isArray(rows) || !rows.length) return false;
  const start = moment(startStr, "YYYY-MM-DD").startOf("day");
  const end = moment(endStr, "YYYY-MM-DD").startOf("day");
  if (!start.isValid() || !end.isValid() || end.isBefore(start)) return false;
  const intervals = rows
    .map((r) => ({
      from: moment(r.rangeFrom).startOf("day"),
      to: moment(r.rangeTo).startOf("day"),
    }))
    .filter((r) => r.from.isValid() && r.to.isValid() && !r.to.isBefore(r.from))
    .sort((a, b) => a.from.valueOf() - b.from.valueOf());
  if (!intervals.length || intervals[0].from.isAfter(start)) return false;
  let reach = intervals[0].to;
  for (let i = 1; i < intervals.length; i += 1) {
    if (intervals[i].from.isAfter(reach.clone().add(1, "day"))) break; // gap
    if (intervals[i].to.isAfter(reach)) reach = intervals[i].to;
  }
  return !reach.isBefore(end);
};

// Contract patch payload sent to updateContract (create + edit both use it).
export const buildContractDto = (values) => ({
  pickUpTime: utils.functions.combineDateAndTime(values.pickUpDate, values.pickUpTime),
  dropOffTime: utils.functions.combineDateAndTime(values.dropOffDate, values.dropOffTime),
  pickUpLocation: values.pickUpLocation,
  dropOffLocation: values.dropOffLocation,
  customerNote: values.customerNote, adminNote: values.adminNote,
  flightNo: values.flightNo,
  pickUpKm: values.pickUpKm, pickUpFuelEighths: values.pickUpFuelEighths,
  rentalType: values.rentalType === "MONTHLY" ? "MONTHLY" : "DAILY",
  dailyPrice: values.dailyPrice,
  monthlyPrice: values.monthlyPrice,
  // extrasTotal / oneWayFee are no longer written from this form — one-off
  // charges are itemised on the "Dönüş Ekstra" tab and roll up into
  // returnExtraAmount, which the backend derives and caches.
  deposit: values.deposit, kmLimit: values.unlimitedKm ? "" : values.kmLimit,
  unlimitedKm: values.unlimitedKm,
  dailyKmLimit: values.unlimitedKm ? "" : values.dailyKmLimit,
  monthlyKmLimit: values.unlimitedKm ? "" : values.monthlyKmLimit,
  kmOverageFee: values.unlimitedKm ? "" : values.kmOverageFee,
  fuelFeePerEighth: values.fuelFeePerEighth,
  vatRate: values.vatRate,
  referenceUserId: values.referenceUserId || null,
  kbsNotifiedAt: values.kbsNotifiedAt || null,
  kbsReleasedAt: values.kbsReleasedAt || null,
  // hgsStatus is derived from the HGS check log server-side — not sent from here.
});

// Merge a loaded reservation onto EMPTY_CONTRACT for formik.
export const contractToFormValues = (r) => ({
  ...EMPTY_CONTRACT, ...r,
  pickUpDate: utils.functions.getDate(r.pickUpTime),
  pickUpTime: utils.functions.getTime(r.pickUpTime),
  dropOffDate: utils.functions.getDate(r.dropOffTime),
  dropOffTime: utils.functions.getTime(r.dropOffTime),
  customerNote: r.customerNote || "", adminNote: r.adminNote || "",
  contractNo: r.contractNo || "", flightNo: r.flightNo || "",
  pickUpKm: r.pickUpKm ?? "",
  pickUpFuelEighths: r.pickUpFuelEighths != null ? String(r.pickUpFuelEighths) : "",
  returnKm: r.returnKm ?? "",
  returnFuelEighths: r.returnFuelEighths != null ? String(r.returnFuelEighths) : "",
  returnedAt: r.returnedAt || "",
  rentalType: r.rentalType || "DAILY",
  dailyPrice: r.dailyPrice ?? "",
  monthlyPrice: r.monthlyPrice ?? "",
  returnExtraAmount: r.returnExtraAmount ?? "",
  deposit: r.deposit ?? "", kmLimit: r.kmLimit ?? "",
  unlimitedKm: r.unlimitedKm ?? true,
  dailyKmLimit: r.dailyKmLimit ?? "", monthlyKmLimit: r.monthlyKmLimit ?? "",
  kmOverageFee: r.kmOverageFee ?? "", fuelFeePerEighth: r.fuelFeePerEighth ?? "",
  vatRate: r.vatRate ?? 20,
  referenceUserId: r.referenceUserId || "",
  kbsNotifiedAt: r.kbsNotifiedAt ? utils.functions.getDate(r.kbsNotifiedAt) : "",
  kbsNotifiedBy: r.kbsNotifiedBy || "",
  kbsReleasedAt: r.kbsReleasedAt || "",
  kbsReleasedBy: r.kbsReleasedBy || "",
  hgsStatus: r.hgsStatus || "",
});

// <select> options for the vehicle picker; create mode gets a leading blank row.
export const buildVehicleOptions = (carList, { isCreate, placeholder }) => [
  ...(isCreate ? [{ id: "__none", value: "", name: `— ${placeholder} —` }] : []),
  ...carList.map((veh) => ({
    id: veh.id, value: veh.id,
    name: `${veh.brand} ${veh.model} — ${veh.licensePlate}${veh.branch ? ` · ${veh.branch.name}` : ""}`,
  })),
];

// Shared label bag passed to every <ContractRecords> instance.
export const buildRecordLabels = (t) => {
  const k = (key) => t(`reservations.contract.records.${key}`);
  return {
    actions: k("actions"), add: k("add"), save: k("save"), cancel: k("cancel"),
    edit: k("edit"), delete: k("delete"), empty: k("empty"), error: k("error"),
    deleteConfirm: k("deleteConfirm"), deleteConfirmText: k("deleteConfirmText"),
  };
};
