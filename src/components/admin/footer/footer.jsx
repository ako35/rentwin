import { useTranslation } from "react-i18next";
import { BsFacebook, BsInstagram, BsLinkedin, BsTwitter } from "react-icons/bs";
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
      <div className="admin-footer__social">
        <a href={website.facebook} target="_blank" rel="noopener noreferrer"><BsFacebook /></a>
        <a href={website.twitter} target="_blank" rel="noopener noreferrer"><BsTwitter /></a>
        <a href={website.instagram} target="_blank" rel="noopener noreferrer"><BsInstagram /></a>
        <a href={website.linkedin} target="_blank" rel="noopener noreferrer"><BsLinkedin /></a>
      </div>
      <a href={`mailto:${website.email}`} className="admin-footer__support">
        {t("footer.requestSupport")}
      </a>
    </div>
  );
};

export default AdminFooter;
