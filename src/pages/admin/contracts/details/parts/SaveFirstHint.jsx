import { useTranslation } from "react-i18next";

// Placeholder shown in sections that need a saved contract before they work.
const SaveFirstHint = () => {
  const { t } = useTranslation("admin");
  return <p className="text-muted mb-0">{t("reservations.contract.saveFirstHint")}</p>;
};

export default SaveFirstHint;
