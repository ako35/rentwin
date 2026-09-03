import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { constants } from "../../../../../constants";
import RoRow from "./RoRow";

// Edit-mode read-only customer view — mirrors the fields shown in create mode's
// <CustomerPanel/> so the customer detail isn't truncated once the contract is
// opened. Editing the customer record itself happens on "Müşteri sayfası".
const CustomerSummary = ({ customer, userId, money }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.${key}`);

  const isCorp = (customer?.customerType || "Bireysel") === "Kurumsal";
  const fmt = money || ((v) => Number(v || 0).toFixed(2));

  return (
    <>
      <RoRow label={c("custType")} value={customer ? (isCorp ? c("corporate") : c("individual")) : ""} />
      {isCorp ? (
        <>
          <RoRow label={c("corporateTitle")} value={customer?.companyTitle} />
          <RoRow label={c("taxOffice")} value={customer?.taxOffice} />
          <RoRow label={c("taxNo")} value={customer?.nationalId} />
        </>
      ) : (
        <>
          <RoRow label={c("customerName")} value={customer ? `${customer.firstName} ${customer.lastName}`.trim() : ""} />
          <RoRow label={c("custNationalId")} value={customer?.nationalId} />
        </>
      )}
      <RoRow label={c("custCode")} value={customer?.customerCode} />
      <RoRow label={c("customerEmail")} value={customer?.email} />
      <RoRow label={c("customerPhone")} value={customer?.phoneNumber} />
      <RoRow label={c("custAddress")} value={customer?.address} />
      <RoRow label={`${t("users.form.city")} / ${t("users.form.district")}`} value={[customer?.city, customer?.district].filter(Boolean).join(" / ")} />
      {customer?.notes && <RoRow label={c("adminNote")} value={customer.notes} />}
      <RoRow label={c("custBalance")} value={customer ? `${fmt(customer.balance)} TL` : ""} />
      {userId && (
        <Link className="contract-page__link" to={`${constants.routes.adminUsers}/${userId}`}>
          {c("openCustomer")}
        </Link>
      )}
    </>
  );
};

export default CustomerSummary;
