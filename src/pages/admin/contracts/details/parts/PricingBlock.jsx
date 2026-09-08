import { useTranslation } from "react-i18next";
import { Form } from "react-bootstrap";
import moment from "moment/moment";
import { computeAllowedKm } from "../contract-helpers";
import "./pricing-block.scss";

// Defined at module scope (not inside PricingBlock) so their component identity
// stays stable across the parent's re-renders — otherwise every keystroke would
// remount the <input> and drop focus.
const AmountRow = ({ label, value, emph, muted }) => (
  <div className={`pricing__row${emph ? " pricing__row--emph" : ""}${muted ? " pricing__row--muted" : ""}`}>
    <span className="pricing__label">{label}</span>
    <span className="pricing__amount">{value} TL</span>
  </div>
);

const InputRow = ({ formik, name, label, suffix = "TL", disabled = false }) => (
  <div className="pricing__row">
    <span className="pricing__label">{label}</span>
    <span className="pricing__field">
      <Form.Control
        type="number"
        value={formik.values[name]}
        onChange={(e) => formik.setFieldValue(name, e.target.value)}
        disabled={disabled}
      />
      <span className="pricing__unit">{suffix}</span>
    </span>
  </div>
);

// The right card's pricing block, laid out as an invoice summary. "A Yöntemi":
// each contract is a chain of billing periods; the card edits the rate of the
// single ACTIVE period, lists the closed ones, and headlines the active-period
// amount. Monthly prices are entered NET — VAT is added on top; daily prices
// stay VAT-inclusive. Totals are reactive (parent useMemo → computePricing).
const PricingBlock = ({ formik, pricing, billableDays, periods = [], collected, money }) => {
  const { t } = useTranslation("admin");
  const c = (key, opts) => t(`reservations.contract.${key}`, opts);
  const setV = (name) => (e) => formik.setFieldValue(name, e.target.value);
  const num = (v) => Number(v) || 0;
  const balance = num(collected) - pricing.contractTotal;
  const allowedKm = computeAllowedKm(formik.values, billableDays);

  const isMonthly = pricing.isMonthly;
  const monthlyUnit = num(formik.values.monthlyPrice) / 30;
  const termText = `${pricing.months} ${c("month")}${
    pricing.days ? ` (+${pricing.days} ${c("day")})` : ""
  }`;
  const day = (d) => (d ? moment.utc(d).format("DD.MM.YY") : "—");

  return (
    <div className="pricing">
      <section className="pricing__group">
        <h4>{c("pricingGroups.service")}</h4>

        <div className="pricing__mode">
          {["DAILY", "MONTHLY"].map((mode) => (
            <button
              key={mode}
              type="button"
              className={formik.values.rentalType === mode ? "is-active" : ""}
              onClick={() => formik.setFieldValue("rentalType", mode)}
            >
              {c(`rentalType.${mode === "DAILY" ? "daily" : "monthly"}`)}
            </button>
          ))}
        </div>

        <div className="pricing__row">
          <span className="pricing__label">{isMonthly ? c("monthlyPriceNet") : c("dailyPrice")}</span>
          <span className="pricing__field">
            {isMonthly ? (
              <Form.Control type="number" value={formik.values.monthlyPrice} onChange={setV("monthlyPrice")} />
            ) : (
              <Form.Control type="number" value={formik.values.dailyPrice} onChange={setV("dailyPrice")} />
            )}
            <span className="pricing__unit">
              {isMonthly ? `TL × ${termText}` : `TL × ${billableDays}`}
            </span>
          </span>
        </div>

        {isMonthly ? (
          <>
            <AmountRow label={c("dailyUnitPrice")} value={money(monthlyUnit)} muted />
            <AmountRow label={c("rentalNet")} value={money(pricing.rentalNet)} />
            <AmountRow label={c("periodVat", { rate: pricing.vatRate })} value={money(pricing.vat)} />
            <AmountRow label={c("periodGross")} value={money(pricing.rentalGross)} emph />
          </>
        ) : (
          <AmountRow label={c("rentalAmount")} value={money(pricing.rentalGross)} />
        )}

        {/* Read-only — the sum of the itemised charges on the "Dönüş Ekstra" tab
            (km overage, missing fuel, one-way fee, HGS, damage …). */}
        <AmountRow label={c("extrasTotal")} value={money(pricing.extras)} />
      </section>

      {periods.length > 1 && (
        <section className="pricing__group">
          <h4>{c("periodsTitle")}</h4>
          <ul className="pricing__periods">
            {periods.map((p) => (
              <li key={p.id} className={`pricing__period${p.status === "ACTIVE" ? " is-active" : ""}`}>
                <span className="pricing__period-range">
                  {c("periodLabel", { n: p.sequence })} · {day(p.startAt)}–{day(p.endAt)}
                </span>
                <span className="pricing__period-amount">{money(p.grossAmount)} TL</span>
                <span className="pricing__period-status">
                  {c(`periodStatus.${p.status === "ACTIVE" ? "active" : "closed"}`)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="pricing__group">
        <h4>{c("pricingGroups.limits")}</h4>
        <div className="pricing__row pricing__row--stack">
          <span className="pricing__label">{c("kmLimitTitle")}</span>
          <div className="pricing__control">
            <Form.Check
              type="switch"
              id="km-unl"
              label={c("unlimitedKm")}
              checked={formik.values.unlimitedKm}
              onChange={(e) => formik.setFieldValue("unlimitedKm", e.target.checked)}
            />
          </div>
        </div>
        {!formik.values.unlimitedKm && (
          <>
            <InputRow formik={formik} name="dailyKmLimit" label={c("dailyKmLimit")} suffix="km/gün" />
            <InputRow formik={formik} name="monthlyKmLimit" label={c("monthlyKmLimit")} suffix="km/ay" />
            <InputRow formik={formik} name="kmOverageFee" label={c("kmOverageFee")} suffix="₺/km" />
            <div className="pricing__row">
              <span className="pricing__label">{c("allowedKmForRental")}</span>
              <span className="pricing__amount">
                {Number.isFinite(allowedKm)
                  ? `${Math.round(allowedKm).toLocaleString("tr-TR")} km`
                  : c("noKmLimit")}
              </span>
            </div>
          </>
        )}
        <InputRow formik={formik} name="fuelFeePerEighth" label={c("fuelFeePerEighth")} suffix="₺ / (1/8)" />
      </section>

      <div className="pricing__summary">
        <div className="pricing__summary-total">
          <span>{pricing.hasClosedPeriods ? c("activePeriodTotal") : c("totalAmount")}</span>
          <strong>{money(pricing.activeTotal)} TL</strong>
        </div>
        {pricing.hasClosedPeriods && (
          <div className="pricing__summary-balance">
            <span>{c("contractTotal")}</span>
            <strong>{money(pricing.contractTotal)} TL</strong>
          </div>
        )}
        <div className={`pricing__summary-balance${balance < 0 ? " is-negative" : ""}`}>
          <span>{c("balance")}</span>
          <strong>{money(balance)} TL</strong>
        </div>
      </div>
    </div>
  );
};

export default PricingBlock;
