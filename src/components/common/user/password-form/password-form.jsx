import { useFormik } from "formik";
import { Button, Form } from "react-bootstrap";
import { utils } from "../../../../utils";
import { useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { services } from "../../../../services";
import { PasswordInput } from "../../../";

const UserPasswordForm = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const { builtIn } = user;
  const { t } = useTranslation("user");

  const passwordItems = [
    {
      name: "oldPassword",
      label: t("profile.password.currentPassword"),
    },
    {
      name: "newPassword",
      label: t("profile.password.newPassword"),
    },
    {
      name: "confirmPassword",
      label: t("profile.password.confirmPassword"),
    },
  ];

  const onSubmit = async (values) => {
    setLoading(true);

    const dto = {
      oldPassword: values.oldPassword,
      newPassword: values.newPassword,
    };
    try {
      await services.user.updatePassword(dto);
      utils.functions.swalToast(t("profile.password.successToast"), "success");
      formik.resetForm();
    } catch (error) {
      utils.functions.swalToast(t("profile.password.errorToast"), "error");
    } finally {
      setLoading(false);
    }
  };

  const formik = useFormik({
    initialValues: utils.initialValues.userPasswordFormInitialValues,
    validationSchema: utils.validations.userPasswordFormValidationSchema,
    onSubmit,
  });

  return (
    <Form noValidate onSubmit={formik.handleSubmit}>
      <fieldset disabled={builtIn}>
        {passwordItems.map((item) => {
          <PasswordInput key={item.name} formik={formik} {...item} />;
        })}
        <Button
          type="submit"
          disabled={!(formik.isValid && formik.dirty) || loading}
          className="text-uppercase w-100 mt-3"
        >
          {t("profile.password.updateButton")}
        </Button>
      </fieldset>
    </Form>
  );
};

export default UserPasswordForm;
