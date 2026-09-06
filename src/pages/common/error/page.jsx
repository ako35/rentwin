import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { constants } from "../../../constants";
import { usePageMeta } from "../../../hooks/use-page-meta";
import "./style.scss";

const { routes } = constants;

const ErrorPage = () => {
  const { pathname } = useLocation();
  const { t } = useTranslation("errors");
  const isForbidden = pathname === routes.forbidden;
  const key = isForbidden ? "forbidden" : "notFound";

  usePageMeta({
    title: t(`${key}.title`),
    noindex: true,
    statusCode: isForbidden ? 403 : 404,
  });

  return (
    <main className="error-page">
      <div className="error-page__inner">
        <Link to={routes.home} className="error-page__logo">
          RENT<span>WIN</span>
        </Link>
        <p className="error-page__code">{t(`${key}.code`)}</p>
        <h1 className="error-page__title">{t(`${key}.title`)}</h1>
        <p className="error-page__desc">{t(`${key}.desc`)}</p>
        <div className="error-page__actions">
          <Link to={routes.home} className="btn btn-primary">
            {t("homeCta")}
          </Link>
          <Link to={routes.vehicles} className="btn btn-outline-primary">
            {t("vehiclesCta")}
          </Link>
        </div>
      </div>
    </main>
  );
};

export default ErrorPage;
