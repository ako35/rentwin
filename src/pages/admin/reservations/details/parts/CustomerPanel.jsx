import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner } from "react-bootstrap";
import { services } from "../../../../../services";
import { utils } from "../../../../../utils";
import { custLabel, matchCustomers } from "../contract-helpers";

// Create-mode customer picker: a typeahead to select the driver, an inline
// editable copy of that customer's details, and the per-contract reference
// account. Owns all of its own search / edit state.
const CustomerPanel = ({ formik, customers, refreshCustomers, onRequestNewCustomer, resetKey, money }) => {
  const { t } = useTranslation("admin");
  const c = (key, opts) => t(`reservations.contract.${key}`, opts);

  const [custEdit, setCustEdit] = useState({});
  const [savingCust, setSavingCust] = useState(false);
  const [custQuery, setCustQuery] = useState("");
  const [custOpen, setCustOpen] = useState(false);
  const [refCust, setRefCust] = useState(null);
  const [refQuery, setRefQuery] = useState("");
  const [refOpen, setRefOpen] = useState(false);

  const { userId, referenceUserId } = formik.values;

  // Picked customer -> editable copy + keep the search box label in sync.
  useEffect(() => {
    const sc = customers.find((cx) => cx.id === userId);
    setCustEdit(sc ? { ...sc } : {});
    if (sc) setCustQuery(custLabel(sc));
  }, [userId, customers]);

  // Fresh "Yeni Kontrat" (same route re-used) -> wipe the whole selection.
  useEffect(() => {
    setCustQuery("");
    setCustEdit({});
    setRefCust(null);
    setRefQuery("");
    setRefOpen(false);
    formik.setFieldValue("userId", "");
    formik.setFieldValue("referenceUserId", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const setCE = (key) => (e) => setCustEdit((c0) => ({ ...c0, [key]: e.target.value }));

  const saveCustomer = async () => {
    if (!custEdit.id) return;
    setSavingCust(true);
    try {
      await services.user.updateUserAdmin(custEdit.id, {
        customerType: custEdit.customerType || "Bireysel",
        firstName: custEdit.firstName || "",
        lastName: custEdit.lastName || "",
        companyTitle: custEdit.companyTitle || "",
        taxOffice: custEdit.taxOffice || "",
        email: custEdit.email,
        phoneNumber: custEdit.phoneNumber || "",
        address: custEdit.address || "",
        city: custEdit.city || "",
        district: custEdit.district || "",
        nationalId: custEdit.nationalId || "",
        notes: custEdit.notes || "",
      });
      utils.functions.swalToast(t("users.toasts.updateSuccess"), "success");
      refreshCustomers();
    } catch {
      utils.functions.swalToast(t("reservations.contract.records.error"), "error");
    } finally {
      setSavingCust(false);
    }
  };

  const matches = matchCustomers(customers, custQuery, { keepId: userId });
  const refMatches = matchCustomers(customers, refQuery, { excludeId: userId });
  const refPerson = refCust || customers.find((u) => u.id === referenceUserId);
  const refLabel = refPerson ? custLabel(refPerson) : "…";

  const hasCust = !!custEdit.id;
  const isCorp = (custEdit.customerType || "Bireysel") === "Kurumsal";
  const ci = (name, label, type = "text") => (
    <div className="contract-page__cust-row" key={name}>
      <label>{label}</label>
      <Form.Control size="sm" type={type} value={custEdit[name] || ""} onChange={setCE(name)} disabled={!hasCust} />
    </div>
  );

  return (
    <>
      <div className="contract-page__corp-head">
        <Form.Label className="mb-0">* {c("customerName")}</Form.Label>
        <span>
          <button type="button" className="contract-page__link" onClick={refreshCustomers}>
            ↻ {c("refresh")}
          </button>
          {"  "}
          <button type="button" className="contract-page__link" onClick={onRequestNewCustomer}>
            + {c("newCustomerBtn")}
          </button>
        </span>
      </div>

      <div className="contract-page__typeahead mb-2">
        <Form.Control
          size="sm"
          autoComplete="off"
          placeholder={c("customerSearch")}
          value={custQuery}
          onChange={(e) => {
            // Only filter the list while typing — keep the picked customer
            // (and its info panel) until another one is explicitly selected.
            setCustQuery(e.target.value);
            setCustOpen(true);
          }}
          onFocus={() => setCustOpen(true)}
          onBlur={() =>
            setTimeout(() => {
              setCustOpen(false);
              // Clicked away without picking anyone — restore the box to the
              // currently selected customer instead of leaving a stray query.
              const sc = customers.find((cx) => cx.id === userId);
              if (sc) setCustQuery(custLabel(sc));
            }, 150)
          }
        />
        {custOpen && (
          <ul className="contract-page__typeahead-list">
            {matches.map((u) => (
              <li
                key={u.id}
                onMouseDown={() => {
                  formik.setFieldValue("userId", u.id);
                  setCustQuery(custLabel(u));
                  setCustOpen(false);
                }}
              >
                {custLabel(u)}
              </li>
            ))}
            {matches.length === 0 && (
              <li className="contract-page__typeahead-add" onMouseDown={onRequestNewCustomer}>
                + {c("customerNotFoundAdd")}
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="contract-page__cust-edit">
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
            <Button type="button" size="sm" variant="outline-primary" disabled={savingCust} onClick={saveCustomer}>
              {savingCust && <Spinner animation="border" size="sm" />} {c("updateCustomer")}
            </Button>
          </div>
        )}
        <div className="contract-page__cust-row contract-page__ref-row">
          <label>{c("referenceCari")}</label>
          <div className="contract-page__ref-field">
            {refOpen ? (
              <div className="contract-page__typeahead">
                <Form.Control
                  size="sm"
                  autoComplete="off"
                  autoFocus
                  placeholder={c("referenceCariSearch")}
                  value={refQuery}
                  onChange={(e) => setRefQuery(e.target.value)}
                  onBlur={() => setTimeout(() => setRefOpen(false), 150)}
                />
                <ul className="contract-page__typeahead-list">
                  {refMatches.map((u) => (
                    <li
                      key={u.id}
                      onMouseDown={() => {
                        formik.setFieldValue("referenceUserId", u.id);
                        setRefCust(u);
                        setRefQuery("");
                        setRefOpen(false);
                      }}
                    >
                      {custLabel(u)}
                    </li>
                  ))}
                  {!refMatches.length && <li className="text-muted">{c("referenceCariNoMatch")}</li>}
                </ul>
              </div>
            ) : referenceUserId ? (
              <span className="contract-page__ref-value">
                <button
                  type="button"
                  className="contract-page__link"
                  onClick={() => { setRefQuery(""); setRefOpen(true); }}
                >
                  {refLabel}
                </button>
                <button
                  type="button"
                  className="contract-page__ref-clear"
                  aria-label={c("referenceCariClear")}
                  onClick={() => { formik.setFieldValue("referenceUserId", ""); setRefCust(null); }}
                >
                  &times;
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="contract-page__link"
                onClick={() => { setRefQuery(""); setRefOpen(true); }}
              >
                {c("referenceCariSelect")}
              </button>
            )}
          </div>
        </div>
        <p className="contract-page__ref-hint">{c("referenceCariHint")}</p>
      </div>
    </>
  );
};

export default CustomerPanel;
