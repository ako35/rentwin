import { useTranslation } from "react-i18next";
import { constants } from "../../../../constants";
import { CompanyHeader } from "./print-primitives";

const { website } = constants;

const Row = ({ label, value }) => (
  <div className="cprint-legal__inforow">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

// EK-1: Kiralama ve Finansal Detay Formu — the contract's financial and
// operational terms laid out as a stand-alone annex. Every value is read from
// the contract so each printout is specific to that rental.
const Ek1Form = ({ data, p }) => {
  const { t } = useTranslation("admin");
  const e = (key, opts) => t(`reservations.contract.print.ek1.${key}`, opts);
  const sz = (key, opts) => t(`reservations.contract.print.sozlesme.${key}`, opts);

  const kmLimit = data.kmUnlimited
    ? sz("kmUnlimited")
    : [
        data.dailyKmLimit ? sz("perDay", { n: data.dailyKmLimit }) : null,
        data.monthlyKmLimit ? sz("perMonth", { n: data.monthlyKmLimit }) : null,
      ]
        .filter(Boolean)
        .join(" · ") || e("manualFill");
  const kmOverage = data.kmUnlimited
    ? e("notApplicable")
    : data.kmOverageFee
      ? sz("feePerKm", { v: data.kmOverageFee })
      : e("manualFill");
  const fuelFee = data.fuelFeePerEighth
    ? sz("feePerEighth", { v: data.fuelFeePerEighth })
    : e("manualFill");
  const rent =
    data.rentalType === "MONTHLY" && data.rentGross
      ? e("rentMonthlyNet", {
          net: data.rentNet,
          rate: data.vatRate,
          vat: data.rentVat,
          gross: data.rentGross,
        })
      : data.dailyPrice
        ? e("rentDaily", { v: data.dailyPrice })
        : e("manualFill");

  return (
    <div className="cprint-legal">
      <CompanyHeader subtitle={e("title")} data={data} p={p} />

      <section className="cprint-block">
        <p>{e("intro1", { lessor: website.legalName, lessee: data.customerName })}</p>
        <p>{e("intro2")}</p>
      </section>

      <section className="cprint-block">
        <h2>{e("s1title")}</h2>
        <div className="cprint-legal__infogrid">
          <Row label={e("f_start")} value={data.pickUpDate} />
          <Row label={e("f_end")} value={`${data.dropOffDate} · ${data.fullTerm}`} />
          <Row label={e("f_deposit")} value={data.deposit ? `${data.deposit} ₺` : e("depositless")} />
          <Row label={e("f_payment")} value={e("manualFill")} />
          <Row label={e("f_kmLimit")} value={kmLimit} />
          <Row label={e("f_kmOverage")} value={kmOverage} />
          <Row label={e("f_fuelFee")} value={fuelFee} />
        </div>
      </section>

      <section className="cprint-block">
        <h2>{e("s2title")}</h2>
        <table className="cprint-legal__vehtable">
          <thead>
            <tr>
              <th>{e("col_vehicle")}</th>
              <th>{e("col_plate")}</th>
              <th>{e("col_year")}</th>
              <th>{data.rentalType === "MONTHLY" ? e("col_rentMonthly") : e("col_rentDaily")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{data.carName}</td>
              <td>{data.plate}</td>
              <td>{data.modelYear}</td>
              <td>{rent}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="cprint-block cprint-block--body">
        <h2>{e("s3title")}</h2>
        {["c1", "c2", "c3", "c4"].map((k) => (
          <p key={k} className="cprint-legal__article-p">
            {e(k)}
          </p>
        ))}
        <p className="cprint-legal__closing">{e("closing", { date: data.contractDate })}</p>
      </section>

      <section className="cprint-sign">
        <div>
          <span>{e("signLessor")}</span>
          <span className="cprint-legal__sign-name">{website.legalNameShort}</span>
          <div className="cprint-sign__line" />
          <span className="cprint-legal__sign-foot">{e("signStamp")}</span>
        </div>
        <div>
          <span>{e("signLessee")}</span>
          <span className="cprint-legal__sign-name">{data.customerName}</span>
          <div className="cprint-sign__line" />
          <span className="cprint-legal__sign-foot">{e("signStamp")}</span>
        </div>
      </section>
    </div>
  );
};

export default Ek1Form;
