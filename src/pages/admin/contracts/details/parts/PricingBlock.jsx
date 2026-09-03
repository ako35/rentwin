import { useTranslation } from "react-i18next";
import { Button, Form } from "react-bootstrap";

// The right card's pricing block: daily price + add-ons + discount + km limit
// + VAT, with the running subtotal/total mirrored from the backend formula.
const PricingBlock = ({ formik, pricing, billableDays, extensionDays, extensionTotal, isCreate, updating, money }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.${key}`);

  const setV = (name) => (e) => formik.setFieldValue(name, e.target.value);
  const priceInput = (name, label, suffix = "TL") => (
    <div className="contract-page__price-row">
      <label>{label}</label>
      <span className="contract-page__price-input">
        <Form.Control type="number" size="sm" value={formik.values[name]} onChange={setV(name)} />
        {suffix}
      </span>
    </div>
  );
  const priceRO = (label, value, kind) => (
    <div className={`contract-page__price-row${kind ? ` contract-page__price-row--${kind}` : ""}`}>
      <label>{label}</label>
      <span>{value}</span>
    </div>
  );

  return (
    <div className="contract-page__pricing-block">
      <div className="contract-page__price-row">
        <label>{c("dailyPrice")}</label>
        <span className="contract-page__price-input">
          <Form.Control type="number" size="sm" value={formik.values.dailyPrice} onChange={setV("dailyPrice")} />
          TL × {billableDays} {c("day")}{extensionDays ? ` (+${extensionDays})` : ""}
        </span>
      </div>
      {priceRO(c("rentalAmount"), `${money(pricing.rental)} TL`)}
      {priceInput("extrasTotal", c("extrasTotal"))}
      {priceInput("oneWayFee", c("oneWayFee"))}
      {priceRO(c("subtotal"), `${money(pricing.rental + pricing.addOns)} TL`, "blue")}

      <div className="contract-page__price-row">
        <label>{c("discount")}</label>
        <span className="contract-page__discount">
          <Form.Check
            inline type="radio" id="disc-flat" label={c("discountFlat")}
            checked={!formik.values.discountIsPercent}
            onChange={() => formik.setFieldValue("discountIsPercent", false)}
          />
          <Form.Check
            inline type="radio" id="disc-pct" label={c("discountPercent")}
            checked={formik.values.discountIsPercent}
            onChange={() => formik.setFieldValue("discountIsPercent", true)}
          />
          <Form.Control type="number" size="sm" value={formik.values.discount} onChange={setV("discount")} />
          <Form.Check
            type="checkbox" id="disc-daily" label={c("discountDailyOnly")}
            checked={formik.values.discountDailyOnly}
            onChange={(e) => formik.setFieldValue("discountDailyOnly", e.target.checked)}
          />
        </span>
      </div>

      <div className="contract-page__price-row">
        <label>{c("kmLimit")}</label>
        <span className="contract-page__km">
          <Form.Control
            type="number" size="sm" value={formik.values.kmLimit} onChange={setV("kmLimit")}
            disabled={formik.values.unlimitedKm}
          /> km
          <Form.Check
            type="checkbox" id="km-unl" label={c("unlimitedKm")}
            checked={formik.values.unlimitedKm}
            onChange={(e) => formik.setFieldValue("unlimitedKm", e.target.checked)}
          />
        </span>
      </div>

      {priceRO(c("uzatmaAmount"), `${money(extensionTotal)} TL`)}
      {priceRO(c("returnExtraAmount"), `${money(formik.values.returnExtraAmount)} TL`)}
      {priceInput("vatRate", c("vatRate"), "%")}
      {priceRO(c("contractAmount"), `${money(pricing.subtotal)} TL`)}
      {priceRO(c("totalAmount"), `${money(pricing.total)} TL`, "total")}

      {!isCreate && (
        <div className="contract-page__price-actions">
          <Button type="submit" variant="outline-primary" size="sm" disabled={updating}>{c("recalc")}</Button>
        </div>
      )}
    </div>
  );
};

export default PricingBlock;
