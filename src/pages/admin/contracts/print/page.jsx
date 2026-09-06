import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import moment from "moment/moment";
import { services } from "../../../../services";
import { constants } from "../../../../constants";
import { Loading } from "../../../../components";
import VehicleDiagram from "./VehicleDiagram";
import "./style.scss";

const { website } = constants;
const DOC_TYPES = ["sozlesme", "ek1", "tutanak"];

const fmtDate = (v) => (v ? moment(v).format("DD.MM.YYYY") : "—");
const fmtDateTime = (v) => (v ? moment(v).format("DD.MM.YYYY HH:mm") : "—");
const fuelLabel = (eighths) =>
  eighths === null || eighths === undefined || eighths === "" ? "—" : `${eighths}/8`;

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
    };
  }, [contract, p, tc]);

  useEffect(() => {
    if (data) document.title = `${p(`${docType}.title`)} — ${data.contractNo}`;
  }, [data, docType, p]);

  if (!DOC_TYPES.includes(docType)) return <div className="cprint">{p("badType")}</div>;
  if (loading) return <Loading />;
  if (error || !data) return <div className="cprint">{p("loadError")}</div>;

  const Field = ({ label, value, wide }) => (
    <div className={`cprint-field${wide ? " cprint-field--wide" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );

  const CompanyHeader = ({ subtitle }) => (
    <header className="cprint-head">
      <div>
        <div className="cprint-head__brand">{website.name}</div>
        <div className="cprint-head__meta">
          {website.address} · {website.phone} · {website.email}
        </div>
      </div>
      <div className="cprint-head__doc">
        <div className="cprint-head__title">{subtitle}</div>
        <div className="cprint-head__no">
          {p("contractNo")}: <strong>{data.contractNo}</strong>
        </div>
        <div className="cprint-head__date">
          {p("date")}: {data.today}
        </div>
      </div>
    </header>
  );

  const PartiesBlock = () => (
    <section className="cprint-block">
      <h2>{p("partiesTitle")}</h2>
      <div className="cprint-grid">
        <Field label={p("lessor")} value={website.name} />
        <Field label={p("lesseeType")} value={data.customerType} />
        <Field label={p("lessee")} value={data.customerName} wide />
        <Field label={p("idNo")} value={data.idNo} />
        <Field label={p("phone")} value={data.phone} />
        {data.contactPerson && <Field label={p("contactPerson")} value={data.contactPerson} />}
        {data.taxOffice && <Field label={p("taxOffice")} value={data.taxOffice} />}
        <Field label={p("address")} value={data.address} wide />
      </div>
    </section>
  );

  const VehicleBlock = () => (
    <section className="cprint-block">
      <h2>{p("vehicleTitle")}</h2>
      <div className="cprint-grid">
        <Field label={p("vehicle")} value={data.carName} />
        <Field label={p("plate")} value={data.plate} />
        <Field label={p("modelYear")} value={data.modelYear} />
        <Field label={p("transmission")} value={data.transmission} />
        <Field label={p("fuelType")} value={data.fuelType} />
        <Field label={p("color")} value={data.color} />
        <Field label={p("chassisNo")} value={data.chassisNo} />
      </div>
    </section>
  );

  const RentalBlock = () => (
    <section className="cprint-block">
      <h2>{p("rentalTitle")}</h2>
      <div className="cprint-grid">
        <Field label={p("pickUp")} value={data.pickUp} />
        <Field label={p("dropOff")} value={data.dropOff} />
        <Field label={p("pickUpLocation")} value={data.pickUpLocation} />
        <Field label={p("dropOffLocation")} value={data.dropOffLocation} />
      </div>
    </section>
  );

  const Signatures = ({ leftLabel, rightLabel }) => (
    <section className="cprint-sign">
      <div>
        <span>{leftLabel}</span>
        <div className="cprint-sign__line" />
      </div>
      <div>
        <span>{rightLabel}</span>
        <div className="cprint-sign__line" />
      </div>
    </section>
  );

  const TextShell = ({ titleKey }) => (
    <>
      <CompanyHeader subtitle={p(`${titleKey}.title`)} />
      <PartiesBlock />
      <VehicleBlock />
      <RentalBlock />
      <section className="cprint-block cprint-block--body">
        <h2>{p(`${titleKey}.bodyTitle`)}</h2>
        <p className="cprint-placeholder">{p(`${titleKey}.placeholder`)}</p>
      </section>
      <Signatures leftLabel={p("signLessor")} rightLabel={p("signLessee")} />
    </>
  );

  const Tutanak = () => {
    const k = (key) => p(`tutanak.${key}`);
    const equipment = k("equipmentList").split("|");
    return (
      <>
        <CompanyHeader subtitle={k("title")} />
        <PartiesBlock />
        <VehicleBlock />

        <section className="cprint-block">
          <h2>{k("stateTitle")}</h2>
          <table className="cprint-state">
            <thead>
              <tr>
                <th />
                <th>{k("atDelivery")}</th>
                <th>{k("atReturn")}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>{k("dateTime")}</th>
                <td>{data.pickUp}</td>
                <td />
              </tr>
              <tr>
                <th>{k("location")}</th>
                <td>{data.pickUpLocation}</td>
                <td />
              </tr>
              <tr>
                <th>{k("km")}</th>
                <td>{data.outKm}</td>
                <td />
              </tr>
              <tr>
                <th>{k("fuel")}</th>
                <td>{data.outFuel}</td>
                <td />
              </tr>
              <tr>
                <th>{k("kbs")}</th>
                <td colSpan={2}>{data.kbs}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="cprint-block">
          <h2>{k("damageTitle")}</h2>
          <VehicleDiagram />
        </section>

        <section className="cprint-block">
          <h2>{k("equipmentTitle")}</h2>
          <ul className="cprint-check">
            {equipment.map((item) => (
              <li key={item}>
                <span className="cprint-check__box" /> {item.trim()}
              </li>
            ))}
          </ul>
        </section>

        <section className="cprint-block">
          <h2>{k("notesTitle")}</h2>
          <div className="cprint-notes" />
        </section>

        <Signatures leftLabel={k("signDeliver")} rightLabel={k("signReceive")} />
      </>
    );
  };

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
        {docType === "tutanak" ? <Tutanak /> : <TextShell titleKey={docType} />}
      </article>
    </div>
  );
};

export default ContractPrintPage;
