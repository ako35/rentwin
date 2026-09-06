import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import { Alert, Button, Form, Spinner } from "react-bootstrap";
import { constants } from "../../../../constants";
import { utils } from "../../../../utils";
import { CustomForm, Loading } from "../../../../components";
import { services } from "../../../../services";
import { TR_PROVINCES, TR_DISTRICTS } from "../../../../constants/tr-geo";
import "./style.scss";

const { routes } = constants;

const EMPTY = {
  customerType: "Bireysel",
  companyTitle: "", taxOffice: "",
  firstName: "", lastName: "", nationalId: "",
  email: "", phoneNumber: "",
  address: "", city: "", district: "",
  active: true, notes: "", roles: [], builtIn: false,
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

  const handleDelete = () => {
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
        ...EMPTY, ...u,
        customerType: u.customerType || "Bireysel",
        companyTitle: u.companyTitle || "",
        taxOffice: u.taxOffice || "",
        nationalId: u.nationalId || "",
        city: u.city || "",
        district: u.district || "",
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

  const provinceOptions = useMemo(() => {
    const opts = [{ id: "__none", value: "", name: `— ${t("users.form.city")} —` },
      ...TR_PROVINCES.map((p) => ({ id: p, value: p, name: p }))];
    const cur = formik.values.city;
    if (cur && !opts.some((o) => o.value === cur)) opts.push({ id: `keep-${cur}`, value: cur, name: cur });
    return opts;
  }, [t, formik.values.city]);

  const districtList =
    TR_DISTRICTS[formik.values.city] ||
    TR_DISTRICTS[Object.keys(TR_DISTRICTS).find(
      (k) => k.toLocaleLowerCase("tr") === (formik.values.city || "").toLocaleLowerCase("tr")
    )] ||
    null;
  const districtOptions = districtList
    ? (() => {
        const opts = [{ id: "__none", value: "", name: `— ${t("users.form.district")} —` },
          ...districtList.map((d) => ({ id: d, value: d, name: d }))];
        const cur = formik.values.district;
        if (cur && !opts.some((o) => o.value === cur)) opts.push({ id: `keep-${cur}`, value: cur, name: cur });
        return opts;
      })()
    : null;

  const phone = { name: "phoneNumber", label: t("users.form.phoneNumber"), asInput: "ReactInputMask", mask: "(999) 999-9999" };

  const identityFields = isCorporate
    ? [
        { name: "companyTitle", label: `* ${t("users.form.corpName")}` },
        { name: "nationalId", label: `* ${t("users.form.corpTaxNo")}` },
        { name: "taxOffice", label: `* ${t("users.form.taxOffice")}` },
      ]
    : [
        { name: "firstName", label: `* ${t("users.form.firstName")}` },
        { name: "lastName", label: `* ${t("users.form.lastName")}` },
        { name: "nationalId", label: `* ${t("users.form.nationalId")}` },
      ];

  const contactFields = isCorporate
    ? [
        { name: "firstName", label: `* ${t("users.form.corpContactFirst")}` },
        { name: "lastName", label: `* ${t("users.form.corpContactLast")}` },
        { ...phone, label: `* ${t("users.form.corpPhone")}` },
        { name: "email", label: `* ${t("users.form.email")}`, type: "email" },
      ]
    : [
        { ...phone },
        { name: "email", label: `* ${t("users.form.email")}`, type: "email" },
      ];

  if (loading) return <Loading height={500} />;

  const disabled = formik.values.builtIn;

  return (
    <Form noValidate onSubmit={formik.handleSubmit} className="customer-form">
      <div className="customer-form__topbar">
        <Link to={`${routes.adminFinance}/cari/${userId}`} className="customer-form__ledger-link">
          {t("finance.openStatement")}
        </Link>
      </div>
      <fieldset disabled={disabled} className="customer-form__fieldset">
        <div className="customer-form__segmented" role="tablist">
          <button
            type="button"
            className={!isCorporate ? "is-active" : ""}
            onClick={() => formik.setFieldValue("customerType", "Bireysel")}
          >
            {t("users.form.individual")}
          </button>
          <button
            type="button"
            className={isCorporate ? "is-active" : ""}
            onClick={() => formik.setFieldValue("customerType", "Kurumsal")}
          >
            {t("users.form.corporate")}
          </button>
        </div>

        <section className="customer-form__card">
          <h3>{isCorporate ? t("users.form.groups.company") : t("users.form.groups.identity")}</h3>
          <div className="customer-form__grid">
            {identityFields.map((item) => (
              <CustomForm key={item.name} formik={formik} {...item} />
            ))}
          </div>
        </section>

        <section className="customer-form__card">
          <h3>{t("users.form.groups.contact")}</h3>
          <div className="customer-form__grid">
            {contactFields.map((item) => (
              <CustomForm key={item.name} formik={formik} {...item} />
            ))}
          </div>
        </section>

        <section className="customer-form__card">
          <h3>{t("users.form.groups.address")}</h3>
          <div className="customer-form__grid">
            <CustomForm
              formik={formik} name="city" type="select" itemsArr={provinceOptions}
              label={isCorporate ? `* ${t("users.form.city")}` : t("users.form.city")}
            />
            {districtOptions ? (
              <CustomForm
                formik={formik} name="district" type="select" itemsArr={districtOptions}
                label={isCorporate ? `* ${t("users.form.district")}` : t("users.form.district")}
              />
            ) : (
              <CustomForm
                formik={formik} name="district"
                label={isCorporate ? `* ${t("users.form.district")}` : t("users.form.district")}
              />
            )}
          </div>
          <CustomForm
            formik={formik} name="address" type="textarea" rows={2}
            label={isCorporate ? `* ${t("users.form.address")}` : t("users.form.address")}
          />
        </section>

        <section className="customer-form__card">
          <h3>{t("users.form.groups.other")}</h3>
          <CustomForm formik={formik} name="notes" label={t("users.form.notes")} type="textarea" rows={2} />
          <Form.Check
            className="mt-2"
            label={t("users.form.active")}
            type="checkbox"
            name="active"
            checked={!!formik.values.active}
            onChange={(e) => formik.setFieldValue("active", e.target.checked)}
          />
        </section>
      </fieldset>

      {disabled && <Alert variant="warning">{t("users.builtInWarning")}</Alert>}

      {!disabled && (
        <div className="customer-form__actions">
          <Button variant="outline-danger" type="button" onClick={handleDelete} disabled={deleting || updating}>
            {deleting && <Spinner animation="border" size="sm" />} {t("users.delete")}
          </Button>
          <span className="customer-form__actions-spacer" />
          <Button variant="outline-secondary" type="button" onClick={() => navigate(-1)}>
            {t("users.cancel")}
          </Button>
          <Button type="submit" disabled={!(formik.dirty && formik.isValid) || updating}>
            {updating && <Spinner animation="border" size="sm" />} {t("users.update")}
          </Button>
        </div>
      )}
    </Form>
  );
};

export default AdminUserDetailsPage;
