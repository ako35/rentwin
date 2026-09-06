import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { constants } from "../../../../../constants";

// Edit-mode read-only customer view — mirrors the fields shown in create mode's
// <CustomerPanel/> so the customer detail isn't truncated once the contract is
// opened. Editing the customer record itself happens on "Müşteri sayfası".
const CustomerSummary = ({ customer, userId, money }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.${key}`);

  const isCorp = (customer?.customerType || "Bireysel") === "Kurumsal";
  const fmt = money || ((v) => Number(v || 0).toFixed(2));
  const balance = Number(customer?.balance || 0);

  const rows = [];
  if (isCorp) {
    rows.push([c("corporateTitle"), customer?.companyTitle]);
    rows.push([c("taxOffice"), customer?.taxOffice]);
    rows.push([c("taxNo"), customer?.nationalId]);
  } else {
    rows.push([c("customerName"), customer ? `${customer.firstName} ${customer.lastName}`.trim() : ""]);
    rows.push([c("custNationalId"), customer?.nationalId]);
  }
  rows.push([c("customerEmail"), customer?.email]);
  rows.push([c("customerPhone"), customer?.phoneNumber]);
  rows.push([`${t("users.form.city")} / ${t("users.form.district")}`, [customer?.city, customer?.district].filter(Boolean).join(" / ")]);

  return (
    <div className="contract-page__cust-summary">
      <div className="contract-page__cust-head">
        <span className="contract-page__cust-type">
          {customer ? (isCorp ? c("corporate") : c("individual")) : ""}
        </span>
        {customer && (
          <span
            className={`contract-page__bal-badge${
              balance < 0 ? " is-negative" : balance > 0 ? " is-positive" : ""
            }`}
          >
            {fmt(customer.balance)} TL · {c("custBalance")}
          </span>
        )}
      </div>

      <dl className="contract-page__cust-grid">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || "—"}</dd>
          </div>
        ))}
        <div className="contract-page__cust-grid-wide">
          <dt>{c("custAddress")}</dt>
          <dd>{customer?.address || "—"}</dd>
        </div>
        {customer?.notes && (
          <div className="contract-page__cust-grid-wide">
            <dt>{c("adminNote")}</dt>
            <dd>{customer.notes}</dd>
          </div>
        )}
      </dl>

      {userId && (
        <Link className="contract-page__link" to={`${constants.routes.adminUsers}/${userId}`}>
          {c("openCustomer")}
        </Link>
      )}
    </div>
  );
};

export default CustomerSummary;
