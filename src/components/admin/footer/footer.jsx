import { useTranslation } from "react-i18next";
import { constants } from "../../../constants";
import "./footer.scss";

const { website } = constants;

const AdminFooter = () => {
  const { t } = useTranslation("admin");

  return (
    <div className="admin-footer">
      <div className="admin-footer__copyright">
        {t("footer.copyright", { year: new Date().getFullYear() })}
      </div>
      <a href={`mailto:${website.email}`} className="admin-footer__support">
        {t("footer.requestSupport")}
      </a>
    </div>
  );
};

export default AdminFooter;
