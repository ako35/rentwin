import { useTranslation } from "react-i18next";
import { Form } from "react-bootstrap";
import { BsFileEarmarkCheck, BsFileEarmarkX } from "react-icons/bs";
import moment from "moment/moment";
import "./signature-section.scss";

// Left card: whether the printed contract has actually been signed —
// KABİS-style, a simple switch that stamps the acting admin + date on the
// null -> set transition (see contracts.controller.updateContract). Saved
// with the rest of the form on "Kaydet".
const SignatureSection = ({ formik }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.signature.${key}`);

  const signedAt = formik.values.signedAt || "";
  const signed = !!signedAt;

  const toggle = (checked) => {
    formik.setFieldValue("signedAt", checked ? moment().format("YYYY-MM-DD") : "");
  };

  return (
    <section className={`contract-card contract-page__sign is-${signed ? "signed" : "pending"}`}>
      <h3>{c("title")}</h3>

      <div className="contract-page__sign-row">
        <Form.Check
          type="switch"
          id="contract-signed"
          label={c("statusLabel")}
          checked={signed}
          onChange={(e) => toggle(e.target.checked)}
        />
        <span className={`contract-page__sign-badge is-${signed ? "signed" : "pending"}`}>
          {signed ? <BsFileEarmarkCheck /> : <BsFileEarmarkX />}
          {signed ? c("statusSigned") : c("statusPending")}
        </span>
      </div>

      {signed ? (
        <div className="contract-page__sign-track">
          <label className="contract-page__sign-date">
            <span>{c("dateLabel")}</span>
            <Form.Control
              type="date"
              value={signedAt}
              onChange={(e) => formik.setFieldValue("signedAt", e.target.value)}
            />
          </label>
          {formik.values.signedBy && (
            <p className="contract-page__sign-stamp">
              {c("stamp", { name: formik.values.signedBy, date: moment(signedAt).format("DD.MM.YYYY") })}
            </p>
          )}
        </div>
      ) : (
        <p className="contract-page__sign-hint">{c("hint")}</p>
      )}
    </section>
  );
};

export default SignatureSection;
