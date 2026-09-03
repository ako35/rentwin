import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Modal, Spinner } from "react-bootstrap";
import { services } from "../../../../../services";
import { utils } from "../../../../../utils";
import { EMPTY_NEW_CUST, newCustFields } from "../contract-helpers";

// Quick "Yeni Müşteri" add, opened from the contract customer picker.
// Creates the customer and hands it back via onCreated; the parent refreshes
// its customer list and selects the new record.
const NewCustomerModal = ({ show, onHide, onCreated }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.${key}`);
  const [form, setForm] = useState(EMPTY_NEW_CUST);
  const [saving, setSaving] = useState(false);

  const isCorp = form.customerType === "Kurumsal";
  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const fields = newCustFields(t, isCorp);
  const canSave = fields.every(([name, , , required]) => !required || form[name].trim());

  useEffect(() => {
    if (show) setForm(EMPTY_NEW_CUST);
  }, [show]);

  const save = async () => {
    setSaving(true);
    try {
      const created = await services.user.createUserAdmin(form);
      utils.functions.swalToast(t("newCustomer.success"), "success");
      onCreated(created);
    } catch (error) {
      utils.functions.swalToast(
        error?.response?.status === 409
          ? t("newCustomer.emailExists")
          : error?.response?.data?.message || t("newCustomer.error"),
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} size="lg" onHide={onHide} contentClassName="contract-page__newcust-modal">
      <Modal.Body>
        <div className="customer-form-card">
          <div className="customer-form-card__card">
            <div className="customer-form-card__head">
              <span>{t("newCustomer.title")}</span>
              <button
                type="button"
                className="customer-form-card__close"
                aria-label={t("reservations.cancel")}
                onClick={onHide}
              >
                <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                  <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="customer-form-card__body">
              <div className="customer-form-card__radios">
                <Form.Check
                  inline type="radio" id="ncm-ind" label={c("individual")}
                  checked={!isCorp}
                  onChange={() => setForm((f) => ({ ...f, customerType: "Bireysel" }))}
                />
                <Form.Check
                  inline type="radio" id="ncm-corp" label={c("corporate")}
                  checked={isCorp}
                  onChange={() => setForm((f) => ({ ...f, customerType: "Kurumsal" }))}
                />
              </div>
              {fields.map(([name, label, placeholder, required]) => (
                <div className="customer-form-card__row" key={name}>
                  <label>{required ? `* ${label}` : label}</label>
                  <Form.Control
                    size="sm"
                    type={name === "email" ? "email" : "text"}
                    placeholder={placeholder || undefined}
                    value={form[name]}
                    onChange={setField(name)}
                  />
                </div>
              ))}
              <div className="customer-form-card__actions">
                <Button variant="outline-secondary" type="button" onClick={onHide}>
                  {t("reservations.cancel")}
                </Button>
                <Button type="button" onClick={save} disabled={saving || !canSave}>
                  {saving && <Spinner animation="border" size="sm" />} {t("newCustomer.create")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default NewCustomerModal;
