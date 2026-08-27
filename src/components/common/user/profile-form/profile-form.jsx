import { useFormik } from "formik";
import { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { utils } from "../../../../utils";
import { services } from "../../../../services";
import { CustomForm } from "../../../";

const UserProfileForm = () => {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation("user");

  const formInputs = [
    {
      name: "firstName",
      label: t("profile.form.firstName"),
    },
    {
      name: "lastName",
      label: t("profile.form.lastName"),
    },
    {
      name: "email",
      label: t("profile.form.email"),
      type: "email",
    },
    {
      name: "phoneNumber",
      label: t("profile.form.phoneNumber"),
      asInput: "ReactInputMask",
      mask: "(999) 999-9999",
    },
    {
      name: "address",
      label: t("profile.form.address"),
    },
    {
      name: "zipCode",
      label: t("profile.form.zipCode"),
      type: "number",
    },
  ];

  const user = useSelector((state) => state.auth.user);

  const initialValues = {
    firstName: user?.firstName,
    lastName: user?.lastName,
    email: user?.email,
    phoneNumber: user?.phoneNumber,
    address: user?.address,
    zipCode: user?.zipCode,
  }

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      await services.user.updateUser(values);
      utils.functions.swalToast(t("profile.form.successToast"), "success");
    } catch (error) {
      utils.functions.swalToast(t("profile.form.errorToast"), "error");
    } finally {
      setLoading(false);
    }
  };

  const formik = useFormik({
    initialValues,
    validationSchema: utils.validations.userProfileFormValidationSchema,
    onSubmit,
  });
  return (
    <Form
      noValidate
      onSubmit={formik.handleSubmit}
      className="user-profile-form"
    >
      <fieldset disabled={user?.builtIn}>
        {
          formInputs.map((input) => (
            <CustomForm key={input.name} formik={formik} {...input} />
          ))
        }
        <Button type="submit" disabled={!(formik.dirty && formik.isValid) || loading} className="text-uppercase w-100 mt-3">
          {t("profile.form.updateButton")}
        </Button>
      </fieldset>
    </Form>
  );
};

export default UserProfileForm;
