import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { constants } from "../../../../../constants";
import RoRow from "./RoRow";

// Edit-mode read-only customer view (create mode uses <CustomerPanel/>).
const CustomerSummary = ({ customer, userId }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.${key}`);

  return (
    <>
      <RoRow label={c("customerName")} value={customer ? `${customer.firstName} ${customer.lastName}` : ""} />
      <RoRow label={c("customerEmail")} value={customer?.email} />
      <RoRow label={c("customerPhone")} value={customer?.phoneNumber} />
      {userId && (
        <Link className="contract-page__link" to={`${constants.routes.adminUsers}/${userId}`}>
          {c("openCustomer")}
        </Link>
      )}
    </>
  );
};

export default CustomerSummary;
