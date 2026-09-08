import { useTranslation } from "react-i18next";
import { constants } from "../../../../constants";
import { CompanyHeader } from "./print-primitives";

const { website } = constants;

// Article keys 1-8 in order; MADDE 5 (km limit / overage / fuel fee) gets a body
// rebuilt from the contract so the printed clause always matches EK-1.
const ARTICLE_KEYS = ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8"];

const Paras = ({ text }) =>
  String(text || "")
    .split("\n")
    .filter(Boolean)
    .map((line, i) => (
      <p key={i} className={line.startsWith("•") ? "cprint-legal__bullet" : ""}>
        {line}
      </p>
    ));

const Article = ({ title, body }) => (
  <section className="cprint-legal__article">
    <h3>{title}</h3>
    <Paras text={body} />
  </section>
);

const GenelSozlesme = ({ data, p }) => {
  const { t } = useTranslation("admin");
  const s = (key, opts) => t(`reservations.contract.print.sozlesme.${key}`, opts);

  const kmLimitText = data.kmUnlimited
    ? s("kmUnlimited")
    : [
        data.dailyKmLimit ? s("perDay", { n: data.dailyKmLimit }) : null,
        data.monthlyKmLimit ? s("perMonth", { n: data.monthlyKmLimit }) : null,
      ]
        .filter(Boolean)
        .join(" · ") || s("notSet");
  const kmOverageText = data.kmOverageFee ? s("feePerKm", { v: data.kmOverageFee }) : s("notSet");
  const fuelFeeText = data.fuelFeePerEighth
    ? s("feePerEighth", { v: data.fuelFeePerEighth })
    : s("notSet");

  const madde5Body =
    (data.kmUnlimited
      ? s("a5unlimited")
      : s("a5limited", { kmLimit: kmLimitText, kmOverageFee: kmOverageText })) +
    "\n" +
    s("a5fuel", { fuelFee: fuelFeeText });

  return (
    <div className="cprint-legal">
      <CompanyHeader subtitle={s("title")} data={data} p={p} />

      {/* TARAFLAR */}
      <section className="cprint-block">
        <h2>{s("partiesHeading")}</h2>
        <div className="cprint-legal__party">
          <div className="cprint-legal__party-label">{s("lessorTitle")}</div>
          <p>
            <strong>{s("lessorLabel")}:</strong> {website.legalName}
          </p>
          <p className="cprint-legal__muted">{s("lessorNote")}</p>
          <p>
            <strong>{s("addrLabel")}:</strong> {website.legalAddress}
          </p>
        </div>
        <div className="cprint-legal__party">
          <div className="cprint-legal__party-label">{s("lesseeTitle")}</div>
          <p>
            <strong>{s("lesseeLabel")}:</strong> {data.customerName} ({data.customerType})
          </p>
          <p>
            <strong>{s("addrLabel")}:</strong> {data.address}
          </p>
          <p>
            <strong>{p("idNo")}:</strong> {data.idNo}
            {data.taxOffice ? ` · ${p("taxOffice")}: ${data.taxOffice}` : ""}
            {data.contactPerson ? ` · ${p("contactPerson")}: ${data.contactPerson}` : ""}
          </p>
        </div>
      </section>

      {/* SÖZLEŞMEYE ESAS KİRALAMA BİLGİLERİ (EK-1 özeti) */}
      <section className="cprint-block">
        <h2>{s("summaryTitle")}</h2>
        <table className="cprint-legal__summary">
          <tbody>
            <tr>
              <th>{s("sumDate")}</th>
              <td>{data.contractDate}</td>
              <th>{s("sumVehicle")}</th>
              <td>
                {data.carName} — {data.plate}
              </td>
            </tr>
            <tr>
              <th>{s("sumPeriod")}</th>
              <td>
                {data.pickUp} — {data.dropOff}
              </td>
              <th>{s("sumKmLimit")}</th>
              <td>{kmLimitText}</td>
            </tr>
            <tr>
              <th>{s("sumKmOverage")}</th>
              <td>{kmOverageText}</td>
              <th>{s("sumFuelFee")}</th>
              <td>{fuelFeeText}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* MADDELER */}
      <section className="cprint-block cprint-block--body">
        {ARTICLE_KEYS.map((key) => (
          <Article
            key={key}
            title={s(`${key}t`)}
            body={key === "a5" ? madde5Body : s(key)}
          />
        ))}
        <p className="cprint-legal__closing">{s("closing", { date: data.contractDate })}</p>
      </section>

      {/* İMZALAR */}
      <section className="cprint-sign">
        <div>
          <span>{s("signLessor")}</span>
          <span className="cprint-legal__sign-name">{website.legalNameShort}</span>
          <div className="cprint-sign__line" />
          <span className="cprint-legal__sign-foot">{s("signStamp")}</span>
        </div>
        <div>
          <span>{s("signLessee")}</span>
          <span className="cprint-legal__sign-name">{data.customerName}</span>
          <div className="cprint-sign__line" />
          <span className="cprint-legal__sign-foot">{s("signStamp")}</span>
        </div>
      </section>
    </div>
  );
};

export default GenelSozlesme;
