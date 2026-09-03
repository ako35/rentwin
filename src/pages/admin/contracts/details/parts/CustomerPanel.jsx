import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Form } from "react-bootstrap";
import { services } from "../../../../../services";
import { utils } from "../../../../../utils";
import { custLabel, matchCustomers } from "../contract-helpers";
import CustomerTypeahead from "./CustomerTypeahead";
import CustomerEditFields from "./CustomerEditFields";
import ReferenceCariField from "./ReferenceCariField";

// Create-mode customer picker: a typeahead to select the driver, an inline
// editable copy of that customer's details, and the per-contract reference
// account. Owns the driver search + edit state; the reference field owns its own.
const CustomerPanel = ({ formik, customers, refreshCustomers, onRequestNewCustomer, resetKey, money }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.${key}`);

  const [custEdit, setCustEdit] = useState({});
  const [savingCust, setSavingCust] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const { userId } = formik.values;

  // Picked customer -> editable copy + keep the search box label in sync.
  useEffect(() => {
    const sc = customers.find((cx) => cx.id === userId);
    setCustEdit(sc ? { ...sc } : {});
    if (sc) setQuery(custLabel(sc));
  }, [userId, customers]);

  // Fresh "Yeni Kontrat" (same route re-used) -> wipe the whole selection.
  useEffect(() => {
    setQuery("");
    setOpen(false);
    setCustEdit({});
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

  const pickDriver = (u) => {
    formik.setFieldValue("userId", u.id);
    setQuery(custLabel(u));
    setOpen(false);
  };

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

      <div className="mb-2">
        <CustomerTypeahead
          query={query}
          onQueryChange={(v) => { setQuery(v); setOpen(true); }}
          open={open}
          options={matchCustomers(customers, query, { keepId: userId })}
          onPick={pickDriver}
          placeholder={c("customerSearch")}
          onFocus={() => setOpen(true)}
          onBlur={() =>
            setTimeout(() => {
              setOpen(false);
              // Clicked away without picking anyone — restore the box to the
              // currently selected customer instead of leaving a stray query.
              const sc = customers.find((cx) => cx.id === userId);
              if (sc) setQuery(custLabel(sc));
            }, 150)
          }
          emptyContent={
            <li className="contract-page__typeahead-add" onMouseDown={onRequestNewCustomer}>
              + {c("customerNotFoundAdd")}
            </li>
          }
        />
      </div>

      <div className="contract-page__cust-edit">
        <CustomerEditFields
          custEdit={custEdit}
          onFieldChange={setCE}
          savingCust={savingCust}
          onSave={saveCustomer}
          money={money}
        />
        <ReferenceCariField
          formik={formik}
          customers={customers}
          excludeUserId={userId}
          resetKey={resetKey}
        />
      </div>
    </>
  );
};

export default CustomerPanel;
