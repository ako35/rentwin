import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Form } from "react-bootstrap";
import { constants } from "../../../constants";
import "./kvkk-consent.scss";

const { routes } = constants;

// KVKK / privacy-policy acceptance checkbox for personal-data forms
// (booking, register). `name` is a boolean formik field validated with
// oneOf([true]); the label string (i18nKey in namespace `ns`) must contain a
// <policy>…</policy> tag, which becomes a new-tab link to the policy page.
const KvkkConsent = ({ formik, name = "kvkkConsent", i18nKey, ns }) => {
  const { t } = useTranslation(ns);
  const invalid = formik.touched[name] && Boolean(formik.errors[name]);

  return (
    <Form.Group className="kvkk-consent mb-3">
      <Form.Check type="checkbox" id={name}>
        <Form.Check.Input
          type="checkbox"
          name={name}
          checked={Boolean(formik.values[name])}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          isInvalid={invalid}
        />
        <Form.Check.Label>
          <Trans
            t={t}
            i18nKey={i18nKey}
            components={{
              policy: (
                <Link to={routes.privacyPolicy} target="_blank" rel="noopener noreferrer" />
              ),
            }}
          />
        </Form.Check.Label>
        <Form.Control.Feedback type="invalid">{formik.errors[name]}</Form.Control.Feedback>
      </Form.Check>
    </Form.Group>
  );
};

export default KvkkConsent;
