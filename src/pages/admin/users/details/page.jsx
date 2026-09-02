import { useNavigate, useParams } from "react-router-dom";
import { constants } from "../../../../constants";
import { useEffect, useState } from "react";
import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import { utils } from "../../../../utils";
import { CustomForm, Loading } from "../../../../components";
import { Alert, Button, ButtonGroup, Form, Row, Spinner } from "react-bootstrap";
import { services } from "../../../../services";

const { routes } = constants;

const EMPTY = {
  customerType: "Bireysel",
  companyTitle: "",
  taxOffice: "",
  firstName: "",
  lastName: "",
  customerCode: "",
  nationalId: "",
  email: "",
  phoneNumber: "",
  address: "",
  zipCode: "",
  active: true,
  notes: "",
  roles: [],
  builtIn: false,
};

const AdminUserDetailsPage = () => {
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { t } = useTranslation("admin");
  const { userId } = useParams();
  const navigate = useNavigate();

  const [initialValues, setInitialValues] = useState(EMPTY);

  const onSubmit = async (values) => {
    setUpdating(true);
    const dto = { ...values, builtIn: false };
    ["password", "roles", "reservations", "createdAt", "updatedAt", "id"].forEach((k) => delete dto[k]);
    try {
      await services.user.updateUserAdmin(userId, dto);
      utils.functions.swalToast(t("users.toasts.updateSuccess"), "success");
    } catch (error) {
      utils.functions.swalToast(t("users.toasts.updateError"), "error");
    } finally {
      setUpdating(false);
    }
  };

  const formik = useFormik({
    initialValues,
    validationSchema: utils.validations.adminUserDetailsFormValidationSchema,
    onSubmit,
    enableReinitialize: true,
  });

  const isCorporate = formik.values.customerType === "Kurumsal";

  const removeUser = async () => {
    setDeleting(true);
    try {
      await services.user.deleteUser(userId);
      await utils.functions.swalToast(t("users.toasts.deleteSuccess"), "success");
      navigate(`${routes.adminUsers}`);
    } catch (error) {
      utils.functions.swalToast(t("users.toasts.deleteError"), "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = async () => {
    utils.functions
      .swalQuestion(t("users.toasts.deleteConfirmTitle"), t("users.toasts.deleteConfirmText"))
      .then((result) => {
        if (result.isConfirmed) removeUser();
      });
  };

  const loadData = async () => {
    try {
      const u = await services.user.getUserAdmin(userId);
      setInitialValues({
        ...EMPTY,
        ...u,
        customerType: u.customerType || "Bireysel",
        companyTitle: u.companyTitle || "",
        taxOffice: u.taxOffice || "",
        customerCode: u.customerCode || "",
        nationalId: u.nationalId || "",
        notes: u.notes || "",
        active: u.active ?? true,
      });
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

  const formItems = isCorporate
    ? [
        { name: "companyTitle", label: `* ${t("users.form.companyTitle")}` },
        { name: "taxOffice", label: t("users.form.taxOffice") },
        { name: "nationalId", label: t("users.form.taxNo") },
        { name: "customerCode", label: t("users.form.customerCode") },
        { name: "firstName", label: t("users.form.contactFirstName") },
        { name: "lastName", label: t("users.form.contactLastName") },
        { name: "email", label: `* ${t("users.form.email")}`, type: "email" },
        { name: "phoneNumber", label: t("users.form.phoneNumber"), asInput: "ReactInputMask", mask: "(999) 999-9999" },
        { name: "address", label: t("users.form.address") },
        { name: "zipCode", label: t("users.form.zipCode") },
      ]
    : [
        { name: "firstName", label: `* ${t("users.form.firstName")}` },
        { name: "lastName", label: `* ${t("users.form.lastName")}` },
        { name: "customerCode", label: t("users.form.customerCode") },
        { name: "nationalId", label: t("users.form.nationalId") },
        { name: "email", label: `* ${t("users.form.email")}`, type: "email" },
        { name: "phoneNumber", label: t("users.form.phoneNumber"), asInput: "ReactInputMask", mask: "(999) 999-9999" },
        { name: "address", label: t("users.form.address") },
        { name: "zipCode", label: t("users.form.zipCode") },
      ];

  if (loading) return <Loading height={500} />;

  return (
    <Form noValidate onSubmit={formik.handleSubmit} className="admin-user-details-form mt-5">
      <fieldset disabled={formik.values.builtIn}>
        <div className="mb-3">
          <Form.Check
            inline type="radio" id="cu-ind" label={t("users.form.individual")}
            checked={!isCorporate}
            onChange={() => formik.setFieldValue("customerType", "Bireysel")}
          />
          <Form.Check
            inline type="radio" id="cu-corp" label={t("users.form.corporate")}
            checked={isCorporate}
            onChange={() => formik.setFieldValue("customerType", "Kurumsal")}
          />
        </div>
        <Row className="row-cols-1 row-cols-md-2 row-cols-lg-3">
          {formItems.map((item) => (
            <CustomForm key={item.name} formik={formik} {...item} />
          ))}
        </Row>
        <CustomForm formik={formik} name="notes" label={t("users.form.notes")} type="textarea" rows={2} />
        <Form.Check
          className="mb-2"
          label={t("users.form.active")}
          type="checkbox"
          name="active"
          checked={!!formik.values.active}
          onChange={(e) => formik.setFieldValue("active", e.target.checked)}
        />
      </fieldset>
      {formik.values.builtIn && <Alert variant="warning">{t("users.builtInWarning")}</Alert>}
      <div className="text-end">
        <ButtonGroup>
          <Button onClick={() => navigate(-1)}>{t("users.cancel")}</Button>
          {!formik.values.builtIn && (
            <>
              <Button type="submit" disabled={!(formik.dirty && formik.isValid) || updating}>
                {updating && <Spinner animation="border" size="sm" />} {t("users.update")}
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting && <Spinner animation="border" size="sm" />} {t("users.delete")}
              </Button>
            </>
          )}
        </ButtonGroup>
      </div>
    </Form>
  );
};

export default AdminUserDetailsPage;
