import { useTranslation } from "react-i18next";
import { Form } from "react-bootstrap";
import { BsClockHistory, BsPatchCheck, BsExclamationTriangle } from "react-icons/bs";

const STATUSES = ["PENDING", "CLEAN", "DEBT"];
const ICONS = { PENDING: BsClockHistory, CLEAN: BsPatchCheck, DEBT: BsExclamationTriangle };

// Left card: HGS / OGS toll-check tracking. The operator records which date
// range was queried on the HGS system, the outcome (clean / has a debt), the
// toll amount and whether it has been reflected to the customer. Saved with the
// contract on "Kaydet"; a debt is actually charged on the "Dönüş Ekstra" tab.
const HgsSection = ({ formik }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.hgs.${key}`);
  const v = formik.values;

  const status = v.hgsStatus || "PENDING";
  const isDebt = status === "DEBT";
  const Icon = ICONS[status];

  const setV = (name) => (e) => formik.setFieldValue(name, e.target.value);

  const changeStatus = (next) => {
    formik.setFieldValue("hgsStatus", next === "PENDING" ? "" : next);
    // First time it leaves "Bekliyor", default the queried range to the rental
    // window — the operator can still adjust it.
    if (next !== "PENDING" && !v.hgsCheckedFrom && !v.hgsCheckedTo) {
      if (v.pickUpDate) formik.setFieldValue("hgsCheckedFrom", v.pickUpDate);
      if (v.dropOffDate) formik.setFieldValue("hgsCheckedTo", v.dropOffDate);
    }
    if (next !== "DEBT") formik.setFieldValue("hgsReflected", false);
  };

  return (
    <section className={`contract-card contract-page__hgs is-${status.toLowerCase()}`}>
      <h3>{c("title")}</h3>

      <div className="contract-page__hgs-row">
        <Form.Select
          className="contract-page__hgs-status"
          value={status}
          onChange={(e) => changeStatus(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{c(`status.${s}`)}</option>
          ))}
        </Form.Select>
        <span className={`contract-page__hgs-badge is-${status.toLowerCase()}`}>
          <Icon />
          {c(`status.${status}`)}
        </span>
      </div>

      {status === "PENDING" ? (
        <p className="contract-page__hgs-hint">{c("hint")}</p>
      ) : (
        <>
          <div className="contract-page__hgs-range">
            <label>
              <span>{c("from")}</span>
              <Form.Control type="date" value={v.hgsCheckedFrom} onChange={setV("hgsCheckedFrom")} />
            </label>
            <label>
              <span>{c("to")}</span>
              <Form.Control
                type="date"
                value={v.hgsCheckedTo}
                min={v.hgsCheckedFrom || undefined}
                onChange={setV("hgsCheckedTo")}
              />
            </label>
          </div>

          {isDebt && (
            <div className="contract-page__hgs-debt">
              <label className="contract-page__hgs-amount">
                <span>{c("amount")}</span>
                <span className="contract-page__hgs-amount-field">
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={v.hgsAmount}
                    onChange={setV("hgsAmount")}
                  />
                  <span>TL</span>
                </span>
              </label>
              <Form.Check
                type="switch"
                id="hgs-reflected"
                label={c("reflected")}
                checked={!!v.hgsReflected}
                onChange={(e) => formik.setFieldValue("hgsReflected", e.target.checked)}
              />
              <p className="contract-page__hgs-hint">{c("debtHint")}</p>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default HgsSection;
