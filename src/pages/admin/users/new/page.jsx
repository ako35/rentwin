import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import { Form, Button, Spinner } from "react-bootstrap";
import { constants } from "../../../../constants";
import { services } from "../../../../services";
import { utils } from "../../../../utils";
import { CustomForm } from "../../../../components";
import { TR_PROVINCES, TR_DISTRICTS } from "../../../../constants/tr-geo";
import "./style.scss";

const { routes } = constants;

const EMPTY = {
  customerType: "Bireysel",
  companyTitle: "", taxOffice: "",
  firstName: "", lastName: "", nationalId: "",
  email: "", phoneNumber: "",
  address: "", city: "", district: "",
};

const AdminNewCustomerPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("admin");
  const [saving, setSaving] = useState(false);

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      const user = await services.user.createUserAdmin({ ...values });
      utils.functions.swalToast(t("newCustomer.success"), "success");
      navigate(`${routes.adminUsers}/${user.id}`);
    } catch (error) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message;
      utils.functions.swalToast(
        status === 409 ? t("newCustomer.emailExists") : message || t("newCustomer.error"),
        "error"
      );
      setSaving(false);
    }
  };

  const formik = useFormik({
    initialValues: EMPTY,
    validationSchema: utils.validations.adminUserDetailsFormValidationSchema,
    validateOnMount: true,
    onSubmit,
  });

  const isCorporate = formik.values.customerType === "Kurumsal";

  const provinceOptions = useMemo(() => {
    const opts = [
      { id: "__none", value: "", name: `— ${t("users.form.city")} —` },
      ...TR_PROVINCES.map((p) => ({ id: p, value: p, name: p })),
    ];
    const cur = formik.values.city;
    if (cur && !opts.some((o) => o.value === cur)) opts.push({ id: `keep-${cur}`, value: cur, name: cur });
    return opts;
  }, [t, formik.values.city]);

  const districtList =
    TR_DISTRICTS[formik.values.city] ||
    TR_DISTRICTS[
      Object.keys(TR_DISTRICTS).find(
        (k) => k.toLocaleLowerCase("tr") === (formik.values.city || "").toLocaleLowerCase("tr")
      )
    ] ||
    null;
  const districtOptions = districtList
    ? [
        { id: "__none", value: "", name: `— ${t("users.form.district")} —` },
        ...districtList.map((d) => ({ id: d, value: d, name: d })),
      ]
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

  return (
    <Form noValidate onSubmit={formik.handleSubmit} className="customer-form">
      <div className="customer-form__head">
        <h2>{t("newCustomer.title")}</h2>
      </div>

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

      <div className="customer-form__actions">
        <span className="customer-form__actions-spacer" />
        <Button variant="outline-secondary" type="button" onClick={() => navigate(routes.adminUsers)}>
          {t("users.cancel")}
        </Button>
        <Button type="submit" disabled={!formik.isValid || saving}>
          {saving && <Spinner animation="border" size="sm" />} {t("newCustomer.create")}
        </Button>
      </div>
    </Form>
  );
};

export default AdminNewCustomerPage;
