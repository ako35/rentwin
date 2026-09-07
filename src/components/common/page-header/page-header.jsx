import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { constants } from "../../../constants";
import "./page-header.scss";

const { routes } = constants;

// Flat dark banner for inner marketing / account pages: a navy ground (no
// photo — faster, cleaner, readable), a centered white title and a breadcrumb
// trail. `crumbs` are the intermediate links between "Ana Sayfa" and the
// current page (usually none: Ana Sayfa › <title>).
const PageHeader = ({ title, crumbs = [] }) => {
  const { t } = useTranslation("common");

  return (
    <div className="page-header">
      <div className="page-header__inner">
        <h1>{title}</h1>
        <nav className="page-header__crumbs" aria-label="breadcrumb">
          <Link to={routes.home}>{t("nav.home")}</Link>
          {crumbs.map((crumb) => (
            <span key={crumb.to || crumb.label}>
              <span className="page-header__sep" aria-hidden="true">
                ›
              </span>
              {crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : <span>{crumb.label}</span>}
            </span>
          ))}
          <span className="page-header__sep" aria-hidden="true">
            ›
          </span>
          <span aria-current="page">{title}</span>
        </nav>
      </div>
    </div>
  );
};

export default PageHeader;
