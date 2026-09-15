import { useTranslation } from "react-i18next";
import { BsPersonBadge } from "react-icons/bs";
import { ContractRecords } from "../../../../../components";
import SaveFirstHint from "./SaveFirstHint";

// Top tab: additional named drivers on the contract (Ek Sürücü) — purely
// informational rows for the printed contract / KABİS filing, no login or
// ledger of their own (see ContractDriver in the Prisma schema).
const DriversTab = ({ isCreate, contractId, recordLabels, onChange }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.${key}`);

  if (isCreate) return <SaveFirstHint />;

  return (
    <ContractRecords
      contractId={contractId}
      resource="drivers"
      onChange={onChange}
      initial={{ firstName: "", lastName: "", licenseNo: "", licenseDate: "", birthDate: "", phone: "" }}
      emptyIcon={<BsPersonBadge />}
      columns={[
        { key: "firstName", label: c("drivers.firstName") },
        { key: "lastName", label: c("drivers.lastName") },
        { key: "licenseNo", label: c("drivers.licenseNo") },
        { key: "licenseDate", label: c("drivers.licenseDate"), kind: "date" },
        { key: "birthDate", label: c("drivers.birthDate"), kind: "date" },
        { key: "phone", label: c("drivers.phone") },
      ]}
      fields={[
        { name: "firstName", label: c("drivers.firstName"), type: "text" },
        { name: "lastName", label: c("drivers.lastName"), type: "text" },
        { name: "licenseNo", label: c("drivers.licenseNo"), type: "text" },
        { name: "licenseDate", label: c("drivers.licenseDate"), type: "date" },
        { name: "birthDate", label: c("drivers.birthDate"), type: "date" },
        { name: "phone", label: c("drivers.phone"), type: "text" },
      ]}
      labels={recordLabels}
    />
  );
};

export default DriversTab;
