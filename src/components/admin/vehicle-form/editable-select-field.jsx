import { useState } from "react";
import { Col, Form } from "react-bootstrap";
import { useTranslation } from "react-i18next";

const CUSTOM = "__custom__";

/**
 * A <select> populated from a list of known values (e.g. brands/models already
 * in the fleet) plus a "+ enter new" escape hatch that swaps to a text input.
 * Keeps a plain string in formik[name].
 */
const EditableSelectField = ({ formik, name, label, options = [], onValuePicked }) => {
  const { t } = useTranslation("admin");
  const value = formik.values[name] || "";
  // Trimmed compare — real fleet data has stray leading/trailing spaces
  // ("FİAT " vs "FİAT"), and without this a value that's genuinely a known
  // option, just with extra whitespace, reads as unmatched and the field
  // falls back to the free-text box for no visible reason.
  const norm = value.trim().toLowerCase();
  const isKnown = options.some((o) => o.toLowerCase() === norm);
  // Only the explicit "+ yeni ekle" escape hatch sets this — it must NOT be
  // latched from a value that merely looked unmatched, or the field gets
  // stuck showing the free-text box forever even once a real match loads a
  // moment later (options start empty while the fleet picklist fetch is in
  // flight, so on mount every value briefly "isn't known").
  const [manual, setManual] = useState(false);

  // While the option list hasn't loaded yet (empty), keep showing the select
  // rather than guessing manual — it snaps onto the right option the instant
  // options arrive. Only once options are actually loaded and the value truly
  // isn't among them do we fall back to the editable text box.
  const forceManual = manual || (value !== "" && options.length > 0 && !isKnown);
  const invalid = formik.touched[name] && !!formik.errors[name];

  return (
    <Col>
      <Form.Group className="mb-3">
        <Form.Label>{label}</Form.Label>

        {forceManual ? (
          <>
            <Form.Control
              name={name}
              value={value}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              isInvalid={invalid}
              autoComplete="off"
            />
            {options.length > 0 && (
              <Form.Text
                role="button"
                className="text-primary"
                onClick={() => {
                  setManual(false);
                  formik.setFieldValue(name, "");
                }}
              >
                {t("vehicles.form.pickFromList")}
              </Form.Text>
            )}
          </>
        ) : (
          <Form.Select
            name={name}
            value={isKnown ? options.find((o) => o.toLowerCase() === norm) : ""}
            onChange={(e) => {
              if (e.target.value === CUSTOM) {
                setManual(true);
                formik.setFieldValue(name, "");
                return;
              }
              formik.setFieldValue(name, e.target.value);
              if (onValuePicked) onValuePicked(e.target.value);
            }}
            onBlur={formik.handleBlur}
            isInvalid={invalid}
          >
            <option value="">{label}...</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
            <option value={CUSTOM}>{t("vehicles.form.enterNew")}</option>
          </Form.Select>
        )}

        <Form.Control.Feedback type="invalid">{formik.errors[name]}</Form.Control.Feedback>
      </Form.Group>
    </Col>
  );
};

export default EditableSelectField;
