import { useTranslation } from "react-i18next";
import { Form } from "react-bootstrap";
import { BsShieldCheck, BsShieldExclamation } from "react-icons/bs";
import moment from "moment/moment";

// Left card: tracks whether this rental was filed in KBS (Kimlik Bildirim
// Sistemi), on which date and by whom. Saved with the contract on "Kaydet";
// the filer name is stamped server-side on the not-filed -> filed transition.
const KbsSection = ({ formik }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.kbs.${key}`);

  const value = formik.values.kbsNotifiedAt || "";
  const by = formik.values.kbsNotifiedBy || "";
  const entered = !!value;

  const toggle = (checked) => {
    formik.setFieldValue("kbsNotifiedAt", checked ? moment().format("YYYY-MM-DD") : "");
    if (!checked) formik.setFieldValue("kbsNotifiedBy", "");
  };

  const stamp = entered
    ? [moment(value).format("DD.MM.YYYY"), by].filter(Boolean).join(" · ")
    : null;

  return (
    <section className={`contract-card contract-page__kbs ${entered ? "is-done" : "is-pending"}`}>
      <h3>{c("title")}</h3>

      <div className="contract-page__kbs-row">
        <Form.Check
          type="switch"
          id="kbs-entered"
          label={c("entered")}
          checked={entered}
          onChange={(e) => toggle(e.target.checked)}
        />
        <span className={`contract-page__kbs-badge ${entered ? "is-done" : "is-pending"}`}>
          {entered ? <BsShieldCheck /> : <BsShieldExclamation />}
          {entered ? c("statusDone") : c("statusPending")}
        </span>
      </div>

      {entered ? (
        <>
          <label className="contract-page__kbs-date">
            <span>{c("dateLabel")}</span>
            <Form.Control
              type="date"
              value={value}
              onChange={(e) => formik.setFieldValue("kbsNotifiedAt", e.target.value)}
            />
          </label>
          {stamp && <p className="contract-page__kbs-stamp">{stamp}</p>}
        </>
      ) : (
        <p className="contract-page__kbs-hint">{c("hint")}</p>
      )}
    </section>
  );
};

export default KbsSection;
