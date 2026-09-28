import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Form, Spinner } from "react-bootstrap";
import { BsFileEarmarkCheck, BsFileEarmarkX } from "react-icons/bs";
import moment from "moment/moment";
import "./signature-section.scss";

// Left card: whether the printed contract has actually been signed —
// KABİS-style, a simple switch that stamps the acting admin + date on the
// null -> set transition (see contracts.controller.updateContract). Normally
// saved with the rest of the form on "Kaydet"; once the contract is closed
// that button disappears (see ContractActions), so `locked` routes the
// on-transition straight through `onToggleLocked` instead — the operator
// often only gets the signed paper back at hand-back, after closing the
// contract, and shouldn't have to reopen it just to record that.
const SignatureSection = ({ formik, locked = false, onToggleLocked }) => {
  const { t } = useTranslation("admin");
  const c = (key, opts) => t(`reservations.contract.signature.${key}`, opts);

  const [saving, setSaving] = useState(false);
  const signedAt = formik.values.signedAt || "";
  const signed = !!signedAt;

  const toggle = async (checked) => {
    const value = checked ? moment().format("YYYY-MM-DD") : "";
    if (locked) {
      setSaving(true);
      try {
        await onToggleLocked(value);
      } finally {
        setSaving(false);
      }
      return;
    }
    formik.setFieldValue("signedAt", value);
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
          // Once closed, marking it signed can still be done (see toggle
          // above), but un-signing an already-signed, closed contract can't —
          // same one-way-after-close rule KbsSection's release/undo follows.
          disabled={saving || (signed && locked)}
          onChange={(e) => toggle(e.target.checked)}
        />
        <span className={`contract-page__sign-badge is-${signed ? "signed" : "pending"}`}>
          {saving ? <Spinner animation="border" size="sm" /> : signed ? <BsFileEarmarkCheck /> : <BsFileEarmarkX />}
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
              disabled={locked}
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
        <p className="contract-page__sign-hint">{c(locked ? "hintClosed" : "hint")}</p>
      )}
    </section>
  );
};

export default SignatureSection;
