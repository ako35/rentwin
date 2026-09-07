import { useFormik } from "formik";
import { useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { Link } from "react-router-dom";
import { Button, Form, Spinner } from "react-bootstrap";
import { utils } from "../../../../utils";
import { services } from "../../../../services";
import { constants } from "../../../../constants";
import CustomForm from "../../custom-form/custom-form";

const ContactForm = () => {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation("contact");

  const subjectOptions = [
    { id: "__ph", value: "", name: t("form.subjectPlaceholder") },
    ...t("form.subjects", { returnObjects: true }).map((s) => ({ id: s, value: s, name: s })),
  ];

  const textFields = [
    { name: "name", label: t("form.name") },
    { name: "email", label: t("form.email"), type: "email" },
    { name: "phone", label: t("form.phone"), type: "text", placeholder: "05XX XXX XX XX" },
  ];

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = { ...values };
      delete payload.kvkk;
      await services.contact.sendMessage(payload);
      utils.functions.swalToast(t("form.successToast"), "success");
      formik.resetForm();
    } catch (error) {
      utils.functions.swalToast(error?.response?.data?.message || t("form.errorToast"), "error");
    } finally {
      setLoading(false);
    }
  };

  const formik = useFormik({
    initialValues: utils.initialValues.contactFormInitialValues,
    validationSchema: utils.validations.contactFormValidationSchema,
    onSubmit,
  });

  return (
    <Form noValidate onSubmit={formik.handleSubmit} className="contact-form">
      {textFields.map((item) => (
        <CustomForm key={item.name} formik={formik} {...item} />
      ))}

      <CustomForm
        formik={formik}
        name="subject"
        label={t("form.subject")}
        type="select"
        itemsArr={subjectOptions}
      />

      <CustomForm
        formik={formik}
        name="body"
        label={t("form.message")}
        type="textarea"
        rows={5}
      />

      <Form.Group className="mb-3 contact-form__kvkk">
        <Form.Check
          id="contact-kvkk"
          name="kvkk"
          checked={formik.values.kvkk}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          isInvalid={formik.touched.kvkk && !!formik.errors.kvkk}
          label={
            <Trans
              t={t}
              i18nKey="form.kvkk"
              components={{
                kvkklink: (
                  <Link
                    to={constants.routes.privacyPolicy}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  />
                ),
              }}
            />
          }
          feedback={formik.errors.kvkk}
          feedbackType="invalid"
        />
      </Form.Group>

      <Button
        type="submit"
        disabled={!(formik.dirty && formik.isValid) || loading}
        className="w-100"
      >
        {loading && <Spinner animation="border" size="sm" />} {t("form.send")}
      </Button>
    </Form>
  );
};

export default ContactForm;
