import { useTranslation } from "react-i18next";
import { Form } from "react-bootstrap";
import moment from "moment/moment";
import { BsClockHistory, BsPatchCheck, BsExclamationTriangle } from "react-icons/bs";

const STATUSES = ["PENDING", "CLEAN", "DEBT"];
const BADGE_ICON = {
  pending: BsClockHistory,
  incomplete: BsClockHistory,
  clean: BsPatchCheck,
  debt: BsExclamationTriangle,
};

// Left card: HGS / OGS toll-check tracking. The operator records which date
// range was queried on the HGS system and the outcome. The check only counts
// as finished once the queried range reaches the (actual or planned) return
// date — until then it stays "Devam Ediyor". A reflected debt rolls into the
// grand total via an auto line on the "Dönüş Ekstra" tab.
const HgsSection = ({ formik }) => {
  const { t } = useTranslation("admin");
  const c = (key, opts) => t(`reservations.contract.hgs.${key}`, opts);
  const v = formik.values;

  const status = v.hgsStatus || "PENDING";
  const isDebt = status === "DEBT";
  const setV = (name) => (e) => formik.setFieldValue(name, e.target.value);

  // The date the toll check must reach: the real hand-back if the vehicle is
  // back, otherwise the contracted drop-off.
  const returned = Boolean(v.returnedAt);
  const returnDate = returned
    ? moment(v.returnedAt).format("YYYY-MM-DD")
    : v.dropOffDate || "";

  const incomplete =
    status !== "PENDING" &&
    !!returnDate &&
    (!v.hgsCheckedTo || v.hgsCheckedTo < returnDate);

  const badgeState =
    status === "PENDING" ? "pending" : incomplete ? "incomplete" : status.toLowerCase();
  const BadgeIcon = BADGE_ICON[badgeState];
  const badgeText = badgeState === "incomplete" ? c("status.INCOMPLETE") : c(`status.${status}`);

  const changeStatus = (next) => {
    formik.setFieldValue("hgsStatus", next === "PENDING" ? "" : next);
    // First time it leaves "Bekliyor", default the queried range: start at the
    // pick-up, end at the (actual or planned) return date.
    if (next !== "PENDING" && !v.hgsCheckedFrom && !v.hgsCheckedTo) {
      if (v.pickUpDate) formik.setFieldValue("hgsCheckedFrom", v.pickUpDate);
      if (returnDate) formik.setFieldValue("hgsCheckedTo", returnDate);
    }
    // A debt reflects to the grand total by default; anything else clears it.
    formik.setFieldValue("hgsReflected", next === "DEBT");
  };

  return (
    <section className={`contract-card contract-page__hgs is-${badgeState}`}>
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
        <span className={`contract-page__hgs-badge is-${badgeState}`}>
          <BadgeIcon />
          {badgeText}
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
              <span>{returned ? c("toReturned") : c("toPlanned")}</span>
              <Form.Control
                type="date"
                value={v.hgsCheckedTo}
                min={v.hgsCheckedFrom || undefined}
                onChange={setV("hgsCheckedTo")}
              />
            </label>
          </div>

          {incomplete && (
            <div className="contract-page__hgs-warn">
              <BsExclamationTriangle />
              <div>
                <p>{c("incompleteWarn", { date: moment(returnDate).format("DD.MM.YYYY") })}</p>
                {v.hgsCheckedTo !== returnDate && (
                  <button
                    type="button"
                    className="contract-page__hgs-fix"
                    onClick={() => formik.setFieldValue("hgsCheckedTo", returnDate)}
                  >
                    {c("setToReturn", { date: moment(returnDate).format("DD.MM.YYYY") })}
                  </button>
                )}
              </div>
            </div>
          )}

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
