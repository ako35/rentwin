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
import { computeRentalTerm } from "../details/contract-helpers";
import "./style.scss";

const DOC_TYPES = ["sozlesme", "ek1", "tutanak"];

// Contract pick-up / drop-off are stored as wall-clock instants (the operator's
// "09.09 21:00" is persisted as 2026-09-09T21:00:00Z), and the rental-term maths
// below reads them back with moment.utc. Render every printed date the same way
// so the sözleşme shows the date that was actually entered — not a copy shifted
// into the viewer's timezone.
const fmtDate = (v) => (v ? moment.utc(v).format("DD.MM.YYYY") : "—");
const fmtDateTime = (v) => (v ? moment.utc(v).format("DD.MM.YYYY HH:mm") : "—");
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
    const vatRate = c.vatRate ?? 20;
    const extensions = c.extensions || [];
    const utcDay = (v) => moment.utc(v).format("YYYY-MM-DD");
    const rentalDays = Math.max(
      1,
      Math.ceil(moment(c.dropOffTime).diff(moment(c.pickUpTime), "hours") / 24)
    );
    // Base rental window = pick-up -> drop-off before the first extension.
    const baseEnd = extensions.length
      ? extensions.map((e) => utcDay(e.previousDropOff)).sort()[0]
      : utcDay(c.dropOffTime);
    const baseTerm = computeRentalTerm({ pickUpDate: utcDay(c.pickUpTime), dropOffDate: baseEnd });
    const fullTermObj = computeRentalTerm({
      pickUpDate: utcDay(c.pickUpTime),
      dropOffDate: utcDay(c.dropOffTime),
    });
    const termLabel = (months, days, fallbackDays) =>
      isMonthly && (months || days)
        ? `${months} ${p("ek1.termMo")}${days ? ` ${days} ${p("ek1.termDay")}` : ""}`
        : `${fallbackDays} ${p("ek1.termDay")}`;
    // Genel Sözleşme / Ek-1 show the whole rental span.
    const fullTerm = isMonthly
      ? termLabel(fullTermObj.months, fullTermObj.days, rentalDays)
      : `${rentalDays} ${p("ek1.termDay")}`;
    // Base rental figures for the Ek-1 rent line (monthly = net + VAT + gross).
    const round2 = (n) => Math.round(n * 100) / 100;
    const baseNet = isMonthly
      ? round2(
          baseTerm.months * (c.monthlyPrice || 0) +
            baseTerm.days * round2((c.monthlyPrice || 0) / 30)
        )
      : round2((c.dailyPrice || 0) * rentalDays);
    const baseVat = isMonthly ? round2(baseNet * (vatRate / 100)) : 0;
    const baseGross = round2(baseNet + baseVat);
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
      fullTerm,
      rentalType: c.rentalType || "DAILY",
      vatRate,
      rentNet: money(baseNet),
      rentVat: isMonthly ? money(baseVat) : null,
      rentGross: money(baseGross),
      kmUnlimited: !!c.unlimitedKm,
      // Only the limit that matches the rental type is printed.
      dailyKmLimit: isMonthly ? null : c.dailyKmLimit ?? null,
      monthlyKmLimit: isMonthly ? c.monthlyKmLimit ?? null : null,
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
