import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner } from "react-bootstrap";
import { constants } from "../../../../constants";
import { services } from "../../../../services";
import { utils } from "../../../../utils";
import "./style.scss";

const { routes } = constants;

const EMPTY = {
  customerType: "Bireysel",
  companyTitle: "",
  firstName: "",
  lastName: "",
  nationalId: "",
  email: "",
  phoneNumber: "",
  address: "",
};

const AdminNewCustomerPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("admin");
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const isCorporate = form.customerType === "Kurumsal";
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const fields = isCorporate
    ? [
        ["companyTitle", t("users.form.corpName"), t("users.form.ph.corpName"), true],
        ["firstName", t("users.form.corpContactFirst"), t("users.form.ph.firstName"), true],
        ["lastName", t("users.form.corpContactLast"), t("users.form.ph.lastName"), true],
        ["nationalId", t("users.form.corpTaxNo"), t("users.form.ph.taxNo"), true],
        ["phoneNumber", t("users.form.corpPhone"), t("users.form.ph.phone"), true],
        ["email", t("users.form.email"), t("users.form.ph.email"), true],
        ["address", t("users.form.address"), t("users.form.ph.address"), true],
      ]
    : [
        ["firstName", t("users.form.firstName"), "", true],
        ["lastName", t("users.form.lastName"), "", true],
        ["nationalId", t("users.form.nationalId"), "", true],
        ["email", t("users.form.email"), "", true],
        ["phoneNumber", t("users.form.phoneNumber"), "", false],
        ["address", t("users.form.address"), "", false],
      ];

  const canSubmit = fields.every(([name, , , required]) => !required || form[name].trim());

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const user = await services.user.createUserAdmin(form);
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

  return (
    <div className="new-contract-page">
      <h2>{t("newCustomer.title")}</h2>
      <form className="new-contract-page__card" onSubmit={submit}>
        <div className="new-contract-page__radios">
          <Form.Check
            inline type="radio" id="nc-ind" label={t("users.form.individual")}
            checked={!isCorporate}
            onChange={() => setForm({ ...form, customerType: "Bireysel" })}
          />
          <Form.Check
            inline type="radio" id="nc-corp" label={t("users.form.corporate")}
            checked={isCorporate}
            onChange={() => setForm({ ...form, customerType: "Kurumsal" })}
          />
        </div>
        {fields.map(([name, label, placeholder, required]) => (
          <div className="new-contract-page__row" key={name}>
            <label>{required ? `* ${label}` : label}</label>
            <Form.Control
              size="sm"
              type={name === "email" ? "email" : "text"}
              placeholder={placeholder || undefined}
              value={form[name]}
              onChange={set(name)}
            />
          </div>
        ))}
        <div className="new-contract-page__actions">
          <Button variant="outline-secondary" type="button" onClick={() => navigate(routes.adminUsers)}>
            {t("reservations.cancel")}
          </Button>
          <Button type="submit" disabled={!canSubmit || saving}>
            {saving && <Spinner animation="border" size="sm" />} {t("newCustomer.create")}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminNewCustomerPage;
