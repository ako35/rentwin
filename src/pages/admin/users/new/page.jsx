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
  taxOffice: "",
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
  const canSubmit =
    form.email.trim() &&
    (isCorporate ? form.companyTitle.trim() : form.firstName.trim() && form.lastName.trim());

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

  const fields = isCorporate
    ? [
        ["companyTitle", `* ${t("users.form.companyTitle")}`],
        ["taxOffice", t("users.form.taxOffice")],
        ["nationalId", t("users.form.taxNo")],
        ["firstName", t("users.form.contactFirstName")],
        ["lastName", t("users.form.contactLastName")],
        ["email", `* ${t("users.form.email")}`],
        ["phoneNumber", t("users.form.phoneNumber")],
        ["address", t("users.form.address")],
      ]
    : [
        ["firstName", `* ${t("users.form.firstName")}`],
        ["lastName", `* ${t("users.form.lastName")}`],
        ["nationalId", t("users.form.nationalId")],
        ["email", `* ${t("users.form.email")}`],
        ["phoneNumber", t("users.form.phoneNumber")],
        ["address", t("users.form.address")],
      ];

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
        <div className="new-contract-page__grid">
          {fields.map(([name, label]) => (
            <Form.Group key={name}>
              <Form.Label>{label}</Form.Label>
              <Form.Control
                type={name === "email" ? "email" : "text"}
                value={form[name]}
                onChange={set(name)}
              />
            </Form.Group>
          ))}
        </div>
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
