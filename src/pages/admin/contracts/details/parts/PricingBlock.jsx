import { useTranslation } from "react-i18next";
import { Form } from "react-bootstrap";
import { computeAllowedKm } from "../contract-helpers";

// Defined at module scope (not inside PricingBlock) so their component identity
// stays stable across the parent's re-renders — otherwise every keystroke would
// remount the <input> and drop focus.
const AmountRow = ({ label, value, emph }) => (
  <div className={`pricing__row${emph ? " pricing__row--emph" : ""}`}>
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

// The right card's pricing block, laid out as an invoice summary: service items,
// limits, tax & total — each an editable input or a read-only amount. Totals are
// reactive (computed in the parent's useMemo), so there is no manual
// "recalculate" step — the action bar's "Kaydet" persists the figures.
const PricingBlock = ({ formik, pricing, billableDays, extensionDays, extensionTotal, collected, money }) => {
  const { t } = useTranslation("admin");
  const c = (key, opts) => t(`reservations.contract.${key}`, opts);
  const setV = (name) => (e) => formik.setFieldValue(name, e.target.value);
  const num = (v) => Number(v) || 0;
  const balance = num(collected) - pricing.total;
  const allowedKm = computeAllowedKm(formik.values, billableDays);

  return (
    <div className="pricing">
      <section className="pricing__group">
        <h4>{c("pricingGroups.service")}</h4>
        <div className="pricing__row">
          <span className="pricing__label">{c("dailyPrice")}</span>
          <span className="pricing__field">
            <Form.Control type="number" value={formik.values.dailyPrice} onChange={setV("dailyPrice")} />
            <span className="pricing__unit">
              TL × {billableDays}
              {extensionDays ? ` (+${extensionDays})` : ""}
            </span>
          </span>
        </div>
        <AmountRow label={c("rentalAmount")} value={money(pricing.rental)} />
        {/* Read-only — the sum of the itemised charges on the "Dönüş Ekstra" tab
            (km overage, missing fuel, one-way fee, HGS, damage …). Priced from
            the rates in the Limitler section and posted automatically on return. */}
        <AmountRow label={c("extrasTotal")} value={money(num(formik.values.returnExtraAmount))} />
      </section>

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

      <section className="pricing__group">
        <h4>{c("pricingGroups.taxTotal")}</h4>
        {extensionTotal > 0 && <AmountRow label={c("uzatmaAmount")} value={money(extensionTotal)} />}
        <AmountRow label={c("contractAmount")} value={money(pricing.subtotal)} emph />
        <AmountRow
          label={c("vatLine", { rate: formik.values.vatRate === "" ? 20 : formik.values.vatRate })}
          value={money(pricing.total - pricing.subtotal)}
        />
      </section>

      <div className="pricing__summary">
        <div className="pricing__summary-total">
          <span>{c("totalAmount")}</span>
          <strong>{money(pricing.total)} TL</strong>
        </div>
        <div className={`pricing__summary-balance${balance < 0 ? " is-negative" : ""}`}>
          <span>{c("balance")}</span>
          <strong>{money(balance)} TL</strong>
        </div>
      </div>
    </div>
  );
};

export default PricingBlock;
