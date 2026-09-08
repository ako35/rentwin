import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Form } from "react-bootstrap";
import { custLabel, matchCustomers } from "../contract-helpers";
import CustomerTypeahead from "./CustomerTypeahead";
import CustomerSummary from "./CustomerSummary";
import ReferenceCariField from "./ReferenceCariField";
import "./customer-panel.scss";

// Create-mode customer picker: a typeahead to choose the driver, then the same
// read-only detail grid the edit screen shows (empty until someone is picked),
// plus the per-contract reference account.
const CustomerPanel = ({ formik, customers, refreshCustomers, onRequestNewCustomer, resetKey, money }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.${key}`);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const { userId } = formik.values;
  const selected = customers.find((cx) => cx.id === userId) || null;

  // Keep the search box label in sync with the picked customer.
  useEffect(() => {
    const sc = customers.find((cx) => cx.id === userId);
    if (sc) setQuery(custLabel(sc));
  }, [userId, customers]);

  // Fresh "Yeni Kontrat" (same route re-used) -> wipe the whole selection.
  useEffect(() => {
    setQuery("");
    setOpen(false);
    formik.setFieldValue("userId", "");
    formik.setFieldValue("referenceUserId", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

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
          onQueryChange={(v) => {
            setQuery(v);
            setOpen(true);
          }}
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

      <CustomerSummary customer={selected} userId={userId} money={money} />

      <ReferenceCariField
        formik={formik}
        customers={customers}
        excludeUserId={userId}
        resetKey={resetKey}
      />
    </>
  );
};

export default CustomerPanel;
