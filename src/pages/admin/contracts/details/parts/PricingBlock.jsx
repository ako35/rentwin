import { useTranslation } from "react-i18next";
import { Form } from "react-bootstrap";

// The right card's pricing block, laid out as an invoice summary: service items,
// discount & limits, tax & total — each an editable input or a read-only amount.
// Totals are reactive (computed in the parent's useMemo), so there is no manual
// "recalculate" step — the action bar's "Kaydet" persists the figures.
const PricingBlock = ({ formik, pricing, billableDays, extensionDays, extensionTotal, collected, money }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.${key}`);
  const setV = (name) => (e) => formik.setFieldValue(name, e.target.value);
  const num = (v) => Number(v) || 0;
  const balance = num(collected) - pricing.total;

  const AmountRow = ({ label, value, emph }) => (
    <div className={`pricing__row${emph ? " pricing__row--emph" : ""}`}>
      <span className="pricing__label">{label}</span>
      <span className="pricing__amount">{value} TL</span>
    </div>
  );

  const InputRow = ({ name, label, suffix = "TL" }) => (
    <div className="pricing__row">
      <span className="pricing__label">{label}</span>
      <span className="pricing__field">
        <Form.Control type="number" value={formik.values[name]} onChange={setV(name)} />
        <span className="pricing__unit">{suffix}</span>
      </span>
    </div>
  );

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
        <InputRow name="extrasTotal" label={c("extrasTotal")} />
        <InputRow name="oneWayFee" label={c("oneWayFee")} />
        <AmountRow label={c("subtotal")} value={money(pricing.rental + pricing.addOns)} emph />
      </section>

      <section className="pricing__group">
        <h4>{c("pricingGroups.limits")}</h4>
        <div className="pricing__row pricing__row--stack">
          <span className="pricing__label">{c("kmLimit")}</span>
          <div className="pricing__control">
            <span className="pricing__field">
              <Form.Control
                type="number"
                value={formik.values.kmLimit}
                onChange={setV("kmLimit")}
                disabled={formik.values.unlimitedKm}
              />
              <span className="pricing__unit">km</span>
            </span>
            <Form.Check
              type="switch"
              id="km-unl"
              label={c("unlimitedKm")}
              checked={formik.values.unlimitedKm}
              onChange={(e) => formik.setFieldValue("unlimitedKm", e.target.checked)}
            />
          </div>
        </div>
      </section>

      <section className="pricing__group">
        <h4>{c("pricingGroups.taxTotal")}</h4>
        {extensionTotal > 0 && <AmountRow label={c("uzatmaAmount")} value={money(extensionTotal)} />}
        {num(formik.values.returnExtraAmount) > 0 && (
          <AmountRow label={c("returnExtraAmount")} value={money(formik.values.returnExtraAmount)} />
        )}
        <InputRow name="vatRate" label={c("vatRate")} suffix="%" />
        <AmountRow label={c("contractAmount")} value={money(pricing.subtotal)} />
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
