import { useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import i18n from "../../i18n"
import { LocaleContext } from "../../hooks/use-locale"
import { isAccountPath, localeFromPath } from "../../i18n/locale-routing"
import { Header, Footer } from "../../components"
import "./style.scss"

// Mounted at both "/" (TR marketing + the /user account subtree) and "/en"
// (EN marketing only — see router/index.jsx). Reads the *current* locale
// straight from the URL and hands it down via context, so every marketing
// page/link under here (AppLink, useLocalizedNavigate, JSON-LD path helpers)
// stays inside the visitor's language without each one re-deriving it.
//
// /user/* is nested under "/" too (for the shared header/footer) but isn't
// itself locale-routed — isAccountPath() keeps it out of this scheme
// entirely, deferring to its pre-existing language *toggle* instead.
const CommonLayout = () => {
  const { pathname } = useLocation();
  const account = isAccountPath(pathname);
  const locale = account ? null : localeFromPath(pathname);

  useEffect(() => {
    if (account) return; // toggle-driven pages own their own language
    if (i18n.resolvedLanguage !== locale) i18n.changeLanguage(locale);
  }, [account, locale]);

  return (
    <LocaleContext.Provider value={locale}>
      <Header />
      <main className="common-main">
        <Outlet />
      </main>
      <Footer />
    </LocaleContext.Provider>
  )
}

export default CommonLayout
