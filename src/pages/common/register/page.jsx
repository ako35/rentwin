import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import { utils } from "../../../utils";
import { services } from "../../../services";
import { constants } from "../../../constants";
import { Button, Form, Spinner } from "react-bootstrap";
import { CustomForm, PasswordInput } from "../../../components";
import "./style.scss";

const { routes } = constants;

const RegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation("auth");

  const formItems = [
    {
      name: "firstName",
      label: t("register.firstNameLabel"),
      placeholder: t("register.firstNamePlaceholder"),
    },
    {
      name: "lastName",
      label: t("register.lastNameLabel"),
      placeholder: t("register.lastNamePlaceholder"),
    },
    {
      name: "email",
      label: t("register.emailLabel"),
      placeholder: t("register.emailPlaceholder"),
      type: "email",
    },
    {
      name: "phoneNumber",
      label: t("register.phoneLabel"),
      placeholder: t("register.phonePlaceholder"),
      asInput: "ReactInputMask",
      mask: "(999) 999-9999",
    },
    {
      name: "address",
      label: t("register.addressLabel"),
      placeholder: t("register.addressPlaceholder"),
    },
    {
      name: "zipCode",
      label: t("register.zipCodeLabel"),
      placeholder: t("register.zipCodePlaceholder"),
      type: "number",
    },
  ];

  const passwordItems = [
    {
      name: "password",
      label: t("register.passwordLabel"),
      placeholder: t("register.passwordPlaceholder"),
    },
    {
      name: "confirmPassword",
      label: t("register.confirmPasswordLabel"),
      placeholder: t("register.confirmPasswordPlaceholder"),
    },
  ];

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      await services.user.register(values);
      await utils.functions.swalToast(t("register.successToast"), "success");
      navigate(routes.login);
    } catch (error) {
      utils.functions.swalToast(error.response.data.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const formik = useFormik({
    initialValues: utils.initialValues.registerFormInitialValues,
    validationSchema: utils.validations.registerFormValidationSchema,
    onSubmit,
  });
  return (
    <Form onSubmit={formik.handleSubmit} className="register-form">
      {formItems.map((item, index) => (
        <CustomForm key={index} formik={formik} {...item} />
      ))}
      {passwordItems.map((item, index) => (
        <PasswordInput key={index} formik={formik} {...item} />
      ))}
      <Button
        type="submit"
        disabled={!(formik.dirty && formik.isValid) || loading}
      >
        {loading && <Spinner animation="border" size="sm" />}
        {t("register.registerButton")}
      </Button>
      <p>{t("register.alreadyHaveAccount")}</p>
      <Button onClick={() => navigate(routes.login)} disabled={loading}>
        {t("register.loginButton")}
      </Button>
    </Form>
  );
};

export default RegisterPage;
