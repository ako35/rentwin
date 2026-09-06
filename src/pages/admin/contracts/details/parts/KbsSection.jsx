import { useTranslation } from "react-i18next";
import { Form } from "react-bootstrap";
import moment from "moment/moment";

// Left card: tracks whether this rental was filed in KBS (Kimlik Bildirim
// Sistemi) and on which date. Saved with the contract on "Kaydet".
const KbsSection = ({ formik }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.kbs.${key}`);

  const value = formik.values.kbsNotifiedAt || "";
  const entered = !!value;

  const toggle = (checked) => {
    formik.setFieldValue("kbsNotifiedAt", checked ? moment().format("YYYY-MM-DD") : "");
  };

  return (
    <section className="contract-card contract-page__kbs">
      <h3>{c("title")}</h3>

      <div className="contract-page__kbs-row">
        <Form.Check
          type="checkbox"
          id="kbs-entered"
          label={c("entered")}
          checked={entered}
          onChange={(e) => toggle(e.target.checked)}
        />
        <span className={`contract-page__kbs-badge ${entered ? "is-done" : "is-pending"}`}>
          {entered ? c("statusDone") : c("statusPending")}
        </span>
      </div>

      {entered ? (
        <label className="contract-page__kbs-date">
          <span>{c("dateLabel")}</span>
          <Form.Control
            type="date"
            value={value}
            onChange={(e) => formik.setFieldValue("kbsNotifiedAt", e.target.value)}
          />
        </label>
      ) : (
        <p className="contract-page__kbs-hint">{c("hint")}</p>
      )}
    </section>
  );
};

export default KbsSection;
