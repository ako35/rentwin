import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { constants } from "../../../constants";
import { usePageMeta } from "../../../hooks/use-page-meta";
import { localeFromPath, localizePath } from "../../../i18n/locale-routing";
import "./style.scss";

const { routes } = constants;

// Not nested under CommonLayout (see router/index.jsx — it's a top-level
// catch-all so it also renders for truly unmatched paths, with no
// header/footer chrome), so there's no LocaleContext here — derive the
// locale straight from the URL instead, the same way CommonLayout does.
const ErrorPage = () => {
  const { pathname } = useLocation();
  const { t } = useTranslation("errors");
  const locale = localeFromPath(pathname);
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
        <Link to={localizePath(routes.home, locale)} className="error-page__logo">
          RENT<span>WIN</span>
        </Link>
        <p className="error-page__code">{t(`${key}.code`)}</p>
        <h1 className="error-page__title">{t(`${key}.title`)}</h1>
        <p className="error-page__desc">{t(`${key}.desc`)}</p>
        <div className="error-page__actions">
          <Link to={localizePath(routes.home, locale)} className="btn btn-primary">
            {t("homeCta")}
          </Link>
          <Link to={localizePath(routes.vehicles, locale)} className="btn btn-outline-primary">
            {t("vehiclesCta")}
          </Link>
        </div>
      </div>
    </main>
  );
};

export default ErrorPage;
