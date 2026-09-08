import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useFormik } from "formik";
import { Button, Form, Modal, Spinner } from "react-bootstrap";
import { services } from "../../../../../services";
import { utils } from "../../../../../utils";
import { CustomForm } from "../../../../../components";
import { TR_PROVINCES, TR_DISTRICTS } from "../../../../../constants/tr-geo";
import { EMPTY_NEW_CUST } from "../contract-helpers";
import "./new-customer-modal.scss";

// Quick "Yeni Müşteri" add, opened from the contract customer picker.
// Creates the customer and hands it back via onCreated; the parent refreshes
// its customer list and selects the new record.
const NewCustomerModal = ({ show, onHide, onCreated }) => {
  const { t } = useTranslation("admin");

  const onSubmit = async (values) => {
    try {
      const created = await services.user.createUserAdmin({ ...values });
      utils.functions.swalToast(t("newCustomer.success"), "success");
      onCreated(created);
    } catch (error) {
      utils.functions.swalToast(
        error?.response?.status === 409
          ? t("newCustomer.emailExists")
          : error?.response?.data?.message || t("newCustomer.error"),
        "error"
      );
    }
  };

  const formik = useFormik({
    initialValues: EMPTY_NEW_CUST,
    validationSchema: utils.validations.adminUserDetailsFormValidationSchema,
    validateOnMount: true,
    onSubmit,
  });

  useEffect(() => {
    if (show) formik.resetForm({ values: EMPTY_NEW_CUST });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

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
    <Modal show={show} size="lg" onHide={onHide} contentClassName="contract-page__newcust-modal">
      <Modal.Body>
        <Form noValidate onSubmit={formik.handleSubmit} className="customer-form customer-form--modal">
          <div className="customer-form__head">
            <h2>{t("newCustomer.title")}</h2>
            <button
              type="button"
              className="customer-form__close"
              aria-label={t("reservations.cancel")}
              onClick={onHide}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
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
                label={t("users.form.city")}
              />
              {districtOptions ? (
                <CustomForm
                  formik={formik} name="district" type="select" itemsArr={districtOptions}
                  label={t("users.form.district")}
                />
              ) : (
                <CustomForm formik={formik} name="district" label={t("users.form.district")} />
              )}
            </div>
            <CustomForm formik={formik} name="address" type="textarea" rows={2} label={t("users.form.address")} />
          </section>

          <div className="customer-form__actions">
            <Button variant="outline-secondary" type="button" onClick={onHide}>
              {t("reservations.cancel")}
            </Button>
            <Button type="submit" disabled={formik.isSubmitting || !formik.isValid}>
              {formik.isSubmitting && <Spinner animation="border" size="sm" />} {t("newCustomer.create")}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default NewCustomerModal;
