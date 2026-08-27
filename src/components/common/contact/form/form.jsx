import { useFormik } from "formik";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { utils } from "../../../../utils";
import { services } from "../../../../services";
import { Button, Form, Spinner } from "react-bootstrap";
import CustomForm from "../../custom-form/custom-form";

const ContactForm = () => {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation("contact");

  const formArray = [
    {
        name: "name",
        label: t("form.name"),
    },
    {
        name: "email",
        label: t("form.email"),
        type: "email",
    },
    {
        name: "subject",
        label: t("form.subject"),
    },
    {
        name: "body",
        label: t("form.message"),
        type: "textarea",
        rows: 5,
    },
  ];

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      await services.contact.sendMessage(values);
      utils.functions.swalToast(t("form.successToast"), "success");
      formik.resetForm();
    } catch (error) {
      utils.functions.swalToast(error.response.data.message, "error");
    } finally {
      setLoading(false);
    }
  }

  const formik = useFormik({
    initialValues: utils.initialValues.contactFormInitialValues,
    validationSchema: utils.validations.contactFormValidationSchema,
    onSubmit,
  })

  return (
    <Form noValidate onSubmit={formik.handleSubmit} className="contact-form">
      {formArray.map((item) => (
        <CustomForm key={item.name} formik={formik} {...item} />
      ))}
      <Button type="submit" disabled={!(formik.dirty && formik.isValid) || loading} className="w-100">
        {
          loading && <Spinner animation="border" size="sm" />
        }
        {t("form.send")}
      </Button>
    </Form>
  )
}

export default ContactForm