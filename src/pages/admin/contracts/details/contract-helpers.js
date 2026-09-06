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
  dailyPrice: "", extrasTotal: "", oneWayFee: "", returnExtraAmount: "",
  deposit: "", kmLimit: "", unlimitedKm: true, vatRate: 20,
  referenceUserId: "",
  kbsNotifiedAt: "", kbsNotifiedBy: "", kbsReleasedAt: "", kbsReleasedBy: "",
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

// Live contract totals mirrored from the backend's computeTotal.
export const computePricing = (values, billableDays) => {
  const n = (x) => Number(x) || 0;
  const rental = n(values.dailyPrice) * billableDays;
  const addOns = n(values.extrasTotal) + n(values.oneWayFee) + n(values.returnExtraAmount);
  const subtotal = rental + addOns;
  const vat = values.vatRate === "" ? 20 : n(values.vatRate);
  const total = subtotal * (1 + vat / 100);
  return { rental, addOns, subtotal, total };
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
  dailyPrice: values.dailyPrice, extrasTotal: values.extrasTotal,
  oneWayFee: values.oneWayFee,
  // returnExtraAmount is derived from the itemised return charges (ReturnExtraTab)
  // and cached server-side — it is never written from this form.
  deposit: values.deposit, kmLimit: values.unlimitedKm ? "" : values.kmLimit,
  unlimitedKm: values.unlimitedKm, vatRate: values.vatRate,
  referenceUserId: values.referenceUserId || null,
  kbsNotifiedAt: values.kbsNotifiedAt || null,
  kbsReleasedAt: values.kbsReleasedAt || null,
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
  dailyPrice: r.dailyPrice ?? "", extrasTotal: r.extrasTotal ?? "",
  oneWayFee: r.oneWayFee ?? "", returnExtraAmount: r.returnExtraAmount ?? "",
  deposit: r.deposit ?? "", kmLimit: r.kmLimit ?? "",
  unlimitedKm: r.unlimitedKm ?? true, vatRate: r.vatRate ?? 20,
  referenceUserId: r.referenceUserId || "",
  kbsNotifiedAt: r.kbsNotifiedAt ? utils.functions.getDate(r.kbsNotifiedAt) : "",
  kbsNotifiedBy: r.kbsNotifiedBy || "",
  kbsReleasedAt: r.kbsReleasedAt || "",
  kbsReleasedBy: r.kbsReleasedBy || "",
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
