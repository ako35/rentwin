import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import moment from "moment/moment";
import { services } from "../../../../services";
import { constants } from "../../../../constants";
import { Loading } from "../../../../components";
import GenelSozlesme from "./GenelSozlesme";
import Ek1Form from "./Ek1Form";
import Tutanak from "./Tutanak";
import "./style.scss";

const DOC_TYPES = ["sozlesme", "ek1", "tutanak"];

const fmtDate = (v) => (v ? moment(v).format("DD.MM.YYYY") : "—");
const fmtDateTime = (v) => (v ? moment(v).format("DD.MM.YYYY HH:mm") : "—");
const fuelLabel = (eighths) =>
  eighths === null || eighths === undefined || eighths === "" ? "—" : `${eighths}/8`;
const money = (v) =>
  v === null || v === undefined || v === ""
    ? null
    : Number(v).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const ContractPrintPage = () => {
  const { contractId, docType } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation("admin");
  const { t: tc } = useTranslation("common");
  const p = useCallback((key) => t(`reservations.contract.print.${key}`), [t]);

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    services.contract
      .getContractByIdAdmin(contractId)
      .then(setContract)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [contractId]);

  const data = useMemo(() => {
    if (!contract) return null;
    const c = contract;
    const cust = c.customer || {};
    const car = c.car || {};
    const isMonthly = c.rentalType === "MONTHLY";
    const periods = c.periods || [];
    const activePeriod =
      [...periods].reverse().find((pp) => pp.status === "ACTIVE") || periods[periods.length - 1] || null;
    const rentalDays = Math.max(
      1,
      Math.ceil(moment(c.dropOffTime).diff(moment(c.pickUpTime), "hours") / 24)
    );
    const termLabel = (months, days, fallbackDays) =>
      isMonthly && (months || days)
        ? `${months} ${p("ek1.termMo")}${days ? ` ${days} ${p("ek1.termDay")}` : ""}`
        : `${fallbackDays} ${p("ek1.termDay")}`;
    // Ek-1 = the active period's term; Genel Sözleşme = the whole rental span.
    const rentTerm = activePeriod
      ? termLabel(activePeriod.months, activePeriod.kistDays, rentalDays)
      : termLabel(0, 0, rentalDays);
    const fullTerm = (() => {
      if (!isMonthly) return `${rentalDays} ${p("ek1.termDay")}`;
      const totalMonths = periods.length
        ? periods.reduce((sum, pp) => sum + (pp.months || 0), 0)
        : activePeriod?.months || 0;
      const lastKist = activePeriod?.kistDays || 0;
      return termLabel(totalMonths, lastKist, rentalDays);
    })();
    const isCorp = cust.customerType === "Kurumsal";
    const customerName = isCorp
      ? cust.companyTitle || `${cust.firstName || ""} ${cust.lastName || ""}`.trim()
      : `${cust.firstName || ""} ${cust.lastName || ""}`.trim();
    return {
      contractNo: c.contractNo || "—",
      today: moment().format("DD.MM.YYYY"),
      customerName: customerName || "—",
      customerType: isCorp ? p("corporate") : p("individual"),
      idNo: cust.nationalId || "—",
      taxOffice: cust.taxOffice || "",
      phone: cust.phoneNumber || "—",
      address: [cust.address, cust.district, cust.city].filter(Boolean).join(" / ") || "—",
      contactPerson: isCorp ? `${cust.firstName || ""} ${cust.lastName || ""}`.trim() : "",
      carName: `${car.brand || ""} ${car.model || ""}`.trim() || "—",
      plate: car.licensePlate || "—",
      modelYear: car.modelYear || "—",
      transmission: car.transmission ? tc(`options.transmissionTypes.${car.transmission}`) : "—",
      fuelType: car.fuelType ? tc(`options.fuelTypes.${car.fuelType}`) : "—",
      color: car.color || "—",
      chassisNo: car.chassisNo || "—",
      pickUp: fmtDateTime(c.pickUpTime),
      dropOff: fmtDateTime(c.dropOffTime),
      pickUpLocation: c.pickUpLocation || "—",
      dropOffLocation: c.dropOffLocation || "—",
      outKm: c.pickUpKm ?? "—",
      outFuel: fuelLabel(c.pickUpFuelEighths),
      kbs: c.kbsNotifiedAt ? fmtDate(c.kbsNotifiedAt) : p("tutanak.kbsNotYet"),
      // Genel Sözleşme / Ek-1 — values pulled straight from the contract so the
      // legal clauses and the financial form always match what was agreed.
      contractDate: fmtDate(c.pickUpTime),
      pickUpDate: fmtDate(c.pickUpTime),
      dropOffDate: fmtDate(c.dropOffTime),
      rentalDays,
      rentTerm,
      fullTerm,
      rentalType: c.rentalType || "DAILY",
      vatRate: c.vatRate ?? 20,
      // Active-period figures for the Ek-1 rent line (monthly = net + VAT + gross).
      rentNet: activePeriod ? money(activePeriod.netAmount) : null,
      rentVat: activePeriod ? money((activePeriod.grossAmount || 0) - (activePeriod.netAmount || 0)) : null,
      rentGross: activePeriod ? money(activePeriod.grossAmount) : null,
      kmUnlimited: !!c.unlimitedKm,
      dailyKmLimit: c.dailyKmLimit ?? null,
      monthlyKmLimit: c.monthlyKmLimit ?? null,
      kmOverageFee: money(c.kmOverageFee),
      fuelFeePerEighth: money(c.fuelFeePerEighth),
      deposit: money(c.deposit),
      dailyPrice: money(c.dailyPrice),
    };
  }, [contract, p, tc]);

  useEffect(() => {
    if (data) document.title = `${p(`${docType}.title`)} — ${data.contractNo}`;
  }, [data, docType, p]);

  if (!DOC_TYPES.includes(docType)) return <div className="cprint">{p("badType")}</div>;
  if (loading) return <Loading />;
  if (error || !data) return <div className="cprint">{p("loadError")}</div>;

  return (
    <div className="cprint">
      <div className="cprint__toolbar no-print">
        <button type="button" onClick={() => navigate(-1)}>
          {p("close")}
        </button>
        <div className="cprint__toolbar-tabs">
          {DOC_TYPES.map((d) => (
            <button
              key={d}
              type="button"
              className={d === docType ? "is-active" : ""}
              onClick={() => navigate(`${constants.routes.adminContracts}/${contractId}/yazdir/${d}`)}
            >
              {p(`${d}.tab`)}
            </button>
          ))}
        </div>
        <button type="button" className="cprint__toolbar-print" onClick={() => window.print()}>
          {p("print")}
        </button>
      </div>

      <article className="cprint-sheet">
        {docType === "tutanak" && <Tutanak data={data} p={p} />}
        {docType === "sozlesme" && <GenelSozlesme data={data} p={p} />}
        {docType === "ek1" && <Ek1Form data={data} p={p} />}
      </article>
    </div>
  );
};

export default ContractPrintPage;
