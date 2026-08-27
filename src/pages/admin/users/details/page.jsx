import { useNavigate, useParams } from "react-router-dom";
import { constants } from "../../../../constants";
import { useEffect, useState } from "react";
import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import { utils } from "../../../../utils";
import { CustomForm, Loading } from "../../../../components";
import { Form } from "react-router-dom";
import { Alert, Button, ButtonGroup, Row, Spinner } from "react-bootstrap";
import { services } from "../../../../services";

const { routes } = constants;

const AdminUserDetailsPage = () => {
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { t } = useTranslation("admin");

  const formItems = [
    {
      label: t("users.form.firstName"),
      name: "firstName",
    },
    {
      label: t("users.form.lastName"),
      name: "lastName",
    },
    {
      label: t("users.form.email"),
      name: "email",
      type: "email",
    },
    {
      label: t("users.form.phoneNumber"),
      name: "phoneNumber",
      asInput: "ReactInputMask",
      mask: "(999) 999-9999",
    },
    {
      label: t("users.form.address"),
      name: "address",
    },
    {
      label: t("users.form.zipCode"),
      name: "zipCode",
    },
  ];

  const { userId } = useParams();
  const navigate = useNavigate();

  const [initialValues, setInitialValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phoneNumber: "",
    address: "",
    zipCode: "",
    roles: [],
  });

  const onSubmit = async (values) => {
    setUpdating(true);
    if(!values.password){
      delete values.password;
    }
    const dto = { ...values, builtIn: false };
    try {
      await services.user.updateUserAdmin(userId, dto)
      utils.functions.swalToast(t("users.toasts.updateSuccess"), "success");
    } catch (error) {
      utils.functions.swalToast(
        t("users.toasts.updateError"),
        "error"
      )
    } finally{
      setUpdating(false)
    }
  };

  const formik = useFormik({
    initialValues,
    validationSchema: utils.validations.adminUserDetailsFormValidationSchema,
    onSubmit,
    enableReinitialize: true,
  });

  const removeUser = async () => {
    setDeleting(true);
    try {
      await services.user.deleteUser(userId)
      await utils.functions.swalToast(t("users.toasts.deleteSuccess"), "success");
      navigate(`${routes.adminUsers}`);
    } catch (error) {
      utils.functions.swalToast(
        t("users.toasts.deleteError"),
        "error"
      );
    } finally{
      setDeleting(false)
    }
  };

  const handleDelete = async () => {
    utils.functions
      .swalQuestion(
        t("users.toasts.deleteConfirmTitle"),
        t("users.toasts.deleteConfirmText")
      )
      .then((result) => {
        if (result.isConfirmed) {
          removeUser();
        }
      });
  };

  const handleChangeRoles = async (role) => {
    if (formik.values.roles.includes(role)) {
      const newRoles = formik.values.roles.filter((r) => r !== role);
      formik.setFieldValue("roles", newRoles);
    } else {
      formik.setFieldValue("roles", [...formik.values.roles, role]);
    }
  };

  const loadData = async () => {
    try {
      const userData = await services.user.getUserAdmin(userId);
      setInitialValues(userData);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {loading ? (
        <Loading height={500} />
      ) : (
        <Form
          novalidate
          onSubmit={formik.handleSubmit}
          className="admin-user-details-form mt-5"
        >
          <fieldset disabled={formik.values.builtIn}>
            <Row className="row-cols-1 row-cols-md-2 row-cols-lg-3">
              {formItems.map((item) => (
                <CustomForm key={item.name} formik={formik} {...item} />
              ))}
            </Row>
            <Form.Check
              label={t("users.customer")}
              value="Customer"
              type="checkbox"
              name="roles"
              checked={formik.values.roles.includes("Customer")}
              onChange={() => handleChangeRoles("Customer")}
            />
            <Form.Check
              label={t("users.admin")}
              value="Administrator"
              type="checkbox"
              name="roles"
              checked={formik.values.roles.includes("Administrator")}
              onChange={() => handleChangeRoles("Administrator")}
            />
          </fieldset>
          {formik.values.builtIn && (
            <Alert variant="warning">
              {t("users.builtInWarning")}
            </Alert>
          )}
          <div className="text-end">
            <ButtonGroup>
              <Button onClick={() => navigate(-1)}>{t("users.cancel")}</Button>
              {!formik.values.builtIn && (
                <>
                  <Button
                    type="submit"
                    disabled={!(formik.dirty && formik.isValid) || updating}
                  >
                    {updating && <Spinner animation="border" size="sm" />}{" "}
                    {t("users.update")}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting && <Spinner animation="border" size="sm" />}{" "}
                    {t("users.delete")}
                  </Button>
                </>
              )}
            </ButtonGroup>
          </div>
        </Form>
      )}
    </>
  );
};

export default AdminUserDetailsPage;
