import { useEffect, useState } from "react";
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
  const isKnown = options.some((o) => o.toLowerCase() === value.toLowerCase());
  const [manual, setManual] = useState(false);

  // When the vehicle being edited has a value that isn't in the (later-loaded)
  // option list, drop into manual mode so it stays visible/editable.
  useEffect(() => {
    if (value && !isKnown) setManual(true);
  }, [value, isKnown]);

  const forceManual = manual || options.length === 0;
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
            value={isKnown ? options.find((o) => o.toLowerCase() === value.toLowerCase()) : ""}
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
