import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner } from "react-bootstrap";
import { constants } from "../../../../constants";
import { services } from "../../../../services";
import { utils } from "../../../../utils";
import "../../reservations/new/style.scss";

const { routes } = constants;

const EMPTY = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  address: "",
  zipCode: "",
  password: "",
};

const AdminNewCustomerPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("admin");
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const canSubmit = form.firstName.trim() && form.lastName.trim() && form.email.trim();

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const user = await services.user.createUserAdmin(form);
      utils.functions.swalToast(t("newCustomer.success"), "success");
      navigate(`${routes.adminUsers}/${user.id}`);
    } catch (error) {
      utils.functions.swalToast(
        error?.response?.status === 409 ? t("newCustomer.emailExists") : t("newCustomer.error"),
        "error"
      );
      setSaving(false);
    }
  };

  const fields = [
    ["firstName", t("users.form.firstName")],
    ["lastName", t("users.form.lastName")],
    ["email", t("users.form.email")],
    ["phoneNumber", t("users.form.phoneNumber")],
    ["address", t("users.form.address")],
    ["zipCode", t("users.form.zipCode")],
    ["password", t("newCustomer.password")],
  ];

  return (
    <div className="new-contract-page">
      <h2>{t("newCustomer.title")}</h2>
      <form className="new-contract-page__card" onSubmit={submit}>
        <div className="new-contract-page__grid">
          {fields.map(([name, label]) => (
            <Form.Group key={name}>
              <Form.Label>{label}</Form.Label>
              <Form.Control
                type={name === "email" ? "email" : name === "password" ? "text" : "text"}
                value={form[name]}
                onChange={set(name)}
              />
            </Form.Group>
          ))}
        </div>
        <p className="new-contract-page__hint">{t("newCustomer.passwordHint")}</p>
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
