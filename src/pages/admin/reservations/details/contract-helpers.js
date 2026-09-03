import moment from "moment/moment";
import { utils } from "../../../../utils";
import { constants } from "../../../../constants";
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
  customerNote: "", adminNote: "", referenceNo: "", flightNo: "",
  dailyPrice: "", extrasTotal: "", oneWayFee: "", returnExtraAmount: "",
  discount: "", discountIsPercent: false, discountDailyOnly: true,
  deposit: "", kmLimit: "", unlimitedKm: true, vatRate: 20,
  referenceUserId: "",
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
  const discBase = values.discountDailyOnly ? rental : rental + addOns;
  const discAmount = values.discountIsPercent ? (discBase * n(values.discount)) / 100 : n(values.discount);
  const subtotal = rental + addOns - discAmount;
  const vat = values.vatRate === "" ? 20 : n(values.vatRate);
  const total = subtotal * (1 + vat / 100);
  return { rental, addOns, subtotal, total };
};

// Contract patch payload sent to updateReservation (create + edit both use it).
export const buildContractDto = (values) => ({
  pickUpTime: utils.functions.combineDateAndTime(values.pickUpDate, values.pickUpTime),
  dropOffTime: utils.functions.combineDateAndTime(values.dropOffDate, values.dropOffTime),
  pickUpLocation: values.pickUpLocation,
  dropOffLocation: values.dropOffLocation,
  status: values.status,
  customerNote: values.customerNote, adminNote: values.adminNote,
  referenceNo: values.referenceNo, flightNo: values.flightNo,
  dailyPrice: values.dailyPrice, extrasTotal: values.extrasTotal,
  oneWayFee: values.oneWayFee, returnExtraAmount: values.returnExtraAmount,
  discount: values.discount, discountIsPercent: values.discountIsPercent,
  discountDailyOnly: values.discountDailyOnly,
  deposit: values.deposit, kmLimit: values.unlimitedKm ? "" : values.kmLimit,
  unlimitedKm: values.unlimitedKm, vatRate: values.vatRate,
  referenceUserId: values.referenceUserId || null,
});

// Merge a loaded reservation onto EMPTY_CONTRACT for formik.
export const reservationToFormValues = (r) => ({
  ...EMPTY_CONTRACT, ...r,
  pickUpDate: utils.functions.getDate(r.pickUpTime),
  pickUpTime: utils.functions.getTime(r.pickUpTime),
  dropOffDate: utils.functions.getDate(r.dropOffTime),
  dropOffTime: utils.functions.getTime(r.dropOffTime),
  customerNote: r.customerNote || "", adminNote: r.adminNote || "",
  referenceNo: r.referenceNo || "", flightNo: r.flightNo || "",
  dailyPrice: r.dailyPrice ?? "", extrasTotal: r.extrasTotal ?? "",
  oneWayFee: r.oneWayFee ?? "", returnExtraAmount: r.returnExtraAmount ?? "",
  discount: r.discount ?? "", discountIsPercent: r.discountIsPercent ?? false,
  discountDailyOnly: r.discountDailyOnly ?? true,
  deposit: r.deposit ?? "", kmLimit: r.kmLimit ?? "",
  unlimitedKm: r.unlimitedKm ?? true, vatRate: r.vatRate ?? 20,
  referenceUserId: r.referenceUserId || "",
});

// <select> options for the vehicle picker; create mode gets a leading blank row.
export const buildVehicleOptions = (carList, { isCreate, placeholder }) => [
  ...(isCreate ? [{ id: "__none", value: "", name: `— ${placeholder} —` }] : []),
  ...carList.map((veh) => ({
    id: veh.id, value: veh.id,
    name: `${veh.brand} ${veh.model} — ${veh.licensePlate}${veh.branch ? ` · ${veh.branch.name}` : ""}`,
  })),
];

export const buildStatusOptions = (tCommon) =>
  constants.reservationStatus.map((s) => ({ ...s, name: tCommon(`options.reservationStatus.${s.value}`) }));

// Shared label bag passed to every <ContractRecords> instance.
export const buildRecordLabels = (t) => {
  const k = (key) => t(`reservations.contract.records.${key}`);
  return {
    actions: k("actions"), add: k("add"), save: k("save"), cancel: k("cancel"),
    edit: k("edit"), delete: k("delete"), empty: k("empty"), error: k("error"),
    deleteConfirm: k("deleteConfirm"), deleteConfirmText: k("deleteConfirmText"),
  };
};

// Field rows for the "Yeni Müşteri" modal — [name, label, placeholder, required].
export const newCustFields = (t, isCorp) =>
  isCorp
    ? [
        ["companyTitle", t("users.form.corpName"), t("users.form.ph.corpName"), true],
        ["firstName", t("users.form.corpContactFirst"), t("users.form.ph.firstName"), true],
        ["lastName", t("users.form.corpContactLast"), t("users.form.ph.lastName"), true],
        ["nationalId", t("users.form.corpTaxNo"), t("users.form.ph.taxNo"), true],
        ["taxOffice", t("users.form.taxOffice"), t("users.form.ph.taxOffice"), true],
        ["phoneNumber", t("users.form.corpPhone"), t("users.form.ph.phone"), true],
        ["email", t("users.form.email"), t("users.form.ph.email"), true],
        ["address", t("users.form.address"), t("users.form.ph.address"), true],
        ["city", t("users.form.city"), t("users.form.ph.city"), true],
        ["district", t("users.form.district"), t("users.form.ph.district"), true],
      ]
    : [
        ["firstName", t("users.form.firstName"), t("users.form.ph.firstName"), true],
        ["lastName", t("users.form.lastName"), t("users.form.ph.lastName"), true],
        ["nationalId", t("users.form.nationalId"), t("users.form.ph.nationalId"), true],
        ["email", t("users.form.email"), t("users.form.ph.email"), true],
        ["phoneNumber", t("users.form.phoneNumber"), t("users.form.ph.phone"), false],
        ["address", t("users.form.address"), t("users.form.ph.address"), false],
        ["city", t("users.form.city"), t("users.form.ph.city"), false],
        ["district", t("users.form.district"), t("users.form.ph.district"), false],
      ];
