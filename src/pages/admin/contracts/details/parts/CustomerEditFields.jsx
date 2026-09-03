import { useTranslation } from "react-i18next";
import { Button, Form, Spinner } from "react-bootstrap";

// The editable copy of the picked customer's details shown in the create-mode
// customer panel — "Müşteriyi Güncelle" saves it back to the customer record.
const CustomerEditFields = ({ custEdit, onFieldChange, savingCust, onSave, money }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.${key}`);

  const hasCust = !!custEdit.id;
  const isCorp = (custEdit.customerType || "Bireysel") === "Kurumsal";
  const ci = (name, label, type = "text") => (
    <div className="contract-page__cust-row" key={name}>
      <label>{label}</label>
      <Form.Control
        size="sm"
        type={type}
        value={custEdit[name] || ""}
        onChange={onFieldChange(name)}
        disabled={!hasCust}
      />
    </div>
  );

  return (
    <>
      <div className="contract-page__cust-row">
        <label>{c("custType")}</label>
        <strong>{hasCust ? (isCorp ? c("corporate") : c("individual")) : "—"}</strong>
      </div>
      {isCorp ? (
        <>
          {ci("companyTitle", c("corporateTitle"))}
          {ci("taxOffice", c("taxOffice"))}
        </>
      ) : (
        <>
          {ci("firstName", t("users.form.firstName"))}
          {ci("lastName", t("users.form.lastName"))}
        </>
      )}
      {ci("nationalId", isCorp ? c("taxNo") : c("custNationalId"))}
      {ci("email", c("customerEmail"), "email")}
      {ci("phoneNumber", c("customerPhone"))}
      {ci("address", c("custAddress"))}
      {ci("city", t("users.form.city"))}
      {ci("district", t("users.form.district"))}
      {ci("notes", c("adminNote"))}
      <div className="contract-page__cust-row">
        <label>{c("custBalance")}</label>
        <strong>{hasCust ? `${money(custEdit.balance)} TL` : "—"}</strong>
      </div>
      {hasCust && (
        <div className="text-end mt-2">
          <Button type="button" size="sm" variant="outline-primary" disabled={savingCust} onClick={onSave}>
            {savingCust && <Spinner animation="border" size="sm" />} {c("updateCustomer")}
          </Button>
        </div>
      )}
    </>
  );
};

export default CustomerEditFields;
