import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { custLabel, matchCustomers } from "../contract-helpers";
import CustomerTypeahead from "./CustomerTypeahead";

// Per-contract "Referans Cari" row: pick another customer whose account this
// contract's total is billed to. Sits inside the customer edit panel.
const ReferenceCariField = ({ formik, customers, excludeUserId, initialRefCust, resetKey }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.${key}`);

  const [refCust, setRefCust] = useState(initialRefCust || null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setRefCust(null);
    setQuery("");
    setOpen(false);
  }, [resetKey]);

  const { referenceUserId } = formik.values;
  const matches = matchCustomers(customers, query, { excludeId: excludeUserId });
  const person = refCust || customers.find((u) => u.id === referenceUserId);
  const label = person ? custLabel(person) : "…";

  const openSearch = () => { setQuery(""); setOpen(true); };
  const pick = (u) => {
    formik.setFieldValue("referenceUserId", u.id);
    setRefCust(u);
    setQuery("");
    setOpen(false);
  };
  const clear = () => {
    formik.setFieldValue("referenceUserId", "");
    setRefCust(null);
  };

  return (
    <>
      <div className="contract-page__cust-row contract-page__ref-row">
        <label>{c("referenceCari")}</label>
        <div className="contract-page__ref-field">
          {open ? (
            <CustomerTypeahead
              query={query}
              onQueryChange={setQuery}
              open
              autoFocus
              options={matches}
              onPick={pick}
              placeholder={c("referenceCariSearch")}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              emptyContent={<li className="text-muted">{c("referenceCariNoMatch")}</li>}
            />
          ) : referenceUserId ? (
            <span className="contract-page__ref-value">
              <button type="button" className="contract-page__link" onClick={openSearch}>
                {label}
              </button>
              <button
                type="button"
                className="contract-page__ref-clear"
                aria-label={c("referenceCariClear")}
                onClick={clear}
              >
                &times;
              </button>
            </span>
          ) : (
            <button type="button" className="contract-page__link" onClick={openSearch}>
              {c("referenceCariSelect")}
            </button>
          )}
        </div>
      </div>
      <p className="contract-page__ref-hint">{c("referenceCariHint")}</p>
    </>
  );
};

export default ReferenceCariField;
