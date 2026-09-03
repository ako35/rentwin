import { useTranslation } from "react-i18next";
import { ContractRecords } from "../../../../../components";
import SaveFirstHint from "./SaveFirstHint";

// Top tab: named drivers on the contract.
const DriversTab = ({ isCreate, contractId, recordLabels }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.${key}`);

  if (isCreate) return <SaveFirstHint />;

  return (
    <ContractRecords
      contractId={contractId}
      resource="drivers"
      initial={{ firstName: "", lastName: "", licenseNo: "", licenseDate: "", birthDate: "", phone: "" }}
      columns={[
        { key: "firstName", label: c("drivers.firstName") },
        { key: "lastName", label: c("drivers.lastName") },
        { key: "licenseNo", label: c("drivers.licenseNo") },
        { key: "phone", label: c("drivers.phone") },
      ]}
      fields={[
        { name: "firstName", label: c("drivers.firstName") },
        { name: "lastName", label: c("drivers.lastName") },
        { name: "licenseNo", label: c("drivers.licenseNo") },
        { name: "licenseDate", label: c("drivers.licenseDate"), type: "date" },
        { name: "birthDate", label: c("drivers.birthDate"), type: "date" },
        { name: "phone", label: c("drivers.phone") },
      ]}
      labels={recordLabels}
    />
  );
};

export default DriversTab;
