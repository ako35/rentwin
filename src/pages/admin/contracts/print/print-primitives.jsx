import { constants } from "../../../../constants";

const { website } = constants;

// Shared display primitives for the printable contract documents (Sözleşme,
// Ek-1). Each takes the already-flattened `data` object and the `p` translator
// from the print page — they hold no state, so they live at module scope.

export const Field = ({ label, value, wide }) => (
  <div className={`cprint-field${wide ? " cprint-field--wide" : ""}`}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

export const CompanyHeader = ({ subtitle, data, p }) => (
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

export const PartiesBlock = ({ data, p }) => (
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

export const VehicleBlock = ({ data, p }) => (
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

export const RentalBlock = ({ data, p }) => (
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

export const Signatures = ({ leftLabel, rightLabel }) => (
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
