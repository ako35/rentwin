import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GiSandsOfTime } from "react-icons/gi";
import "./style.scss";

const MODULE_KEY_BY_SLUG = {
  "uzun-donem": "longTerm",
  fiyat: "price",
  icerik: "content",
  finans: "finance",
  tanim: "definitions",
  rapor: "report",
};

const AdminComingSoonPage = () => {
  const { module } = useParams();
  const { t } = useTranslation("admin");
  const moduleKey = MODULE_KEY_BY_SLUG[module];
  const moduleLabel = moduleKey ? t(`topNav.${moduleKey}`) : module;

  return (
    <div className="admin-coming-soon">
      <GiSandsOfTime className="admin-coming-soon__icon" />
      <h2>{t("comingSoon.title")}</h2>
      <p>{t("comingSoon.desc", { module: moduleLabel })}</p>
    </div>
  );
};

export default AdminComingSoonPage;
