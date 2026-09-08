import { constants } from "../../../../constants";
import VehicleDiagram from "./VehicleDiagram";

const { website } = constants;

const Cell = ({ label, value }) => (
  <div className="tut-cell">
    <span>{label}</span>
    <strong>{value || "—"}</strong>
  </div>
);

// Araç Teslim/İade Tutanağı: a denser one-page layout with a delivery/return
// state table, a blank damage diagram and an equipment checklist for staff to
// fill in by hand at the counter.
const Tutanak = ({ data, p }) => {
  const k = (key) => p(`tutanak.${key}`);
  const equipment = k("equipmentList").split("|");

  return (
    <div className="tut">
      <header className="tut-head">
        <div>
          <div className="tut-head__brand">{website.name}</div>
          <div className="tut-head__meta">
            {website.address} · {website.phone} · {website.email}
          </div>
        </div>
        <div className="tut-head__right">
          <div className="tut-head__title">{k("title")}</div>
          <div className="tut-head__badges">
            <span>
              {p("contractNo")}: <strong>{data.contractNo}</strong>
            </span>
            <span className="tut-head__date">{data.today}</span>
          </div>
        </div>
      </header>

      <div className="tut-cols">
        <section className="tut-card">
          <h3>{p("partiesTitle")}</h3>
          <div className="tut-card__grid">
            <Cell label={p("lessee")} value={data.customerName} />
            {data.contactPerson && <Cell label={p("contactPerson")} value={data.contactPerson} />}
            <Cell label={p("idNo")} value={data.idNo} />
            <Cell label={p("phone")} value={data.phone} />
            {data.taxOffice && <Cell label={p("taxOffice")} value={data.taxOffice} />}
          </div>
          <div className="tut-card__wide">
            <span>{p("address")}</span>
            <strong>{data.address}</strong>
          </div>
        </section>

        <section className="tut-card">
          <h3>{p("vehicleTitle")}</h3>
          <div className="tut-card__grid">
            <Cell label={p("vehicle")} value={data.carName} />
            <Cell label={p("plate")} value={data.plate} />
            <Cell label={p("chassisNo")} value={data.chassisNo} />
            <Cell label={p("fuelType")} value={`${data.fuelType} · ${data.transmission}`} />
          </div>
          <table className="tut-state">
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
                <td>{data.dropOffLocation}</td>
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
            </tbody>
          </table>
        </section>
      </div>

      <section className="tut-diagram">
        <h3>{k("damageTitle")}</h3>
        <VehicleDiagram />
      </section>

      <section className="tut-equip">
        <h3>{k("equipmentTitle")}</h3>
        <ul className="tut-check">
          {equipment.map((item) => (
            <li key={item}>
              <span className="tut-check__box" /> {item.trim()}
            </li>
          ))}
        </ul>
      </section>

      <section className="tut-notes">
        <h3>
          {k("notesTitle")}
          <span className="tut-notes__kbs">
            {k("kbs")}: {data.kbs}
          </span>
        </h3>
        <div className="tut-notes__lines" />
      </section>

      <div className="tut-sign">
        <div>
          <span>{k("signDeliver")}</span>
        </div>
        <div>
          <span>{k("signReceive")}</span>
        </div>
      </div>
    </div>
  );
};

export default Tutanak;
