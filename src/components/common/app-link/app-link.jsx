import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { useLocale } from "../../../hooks/use-locale";
import { localizePath } from "../../../i18n/locale-routing";

// Drop-in replacement for react-router-dom's <Link> that keeps internal
// navigation inside the current TR/EN URL locale — e.g. clicking "Araçlar"
// while reading /en/... goes to /en/vehicles, not /vehicles. Falls back to
// plain <Link> behaviour (no prefixing) outside the locale-routed marketing
// tree (admin/auth/user), where useLocale() has nothing to read and
// defaults to "tr" == a no-op prefix.
//
// Only string, in-app ("/...") `to` values are localized; an object `to`
// ({ pathname, search }) or an external URL passes through untouched.
const AppLink = forwardRef(({ to, ...props }, ref) => {
  const locale = useLocale();
  const href = typeof to === "string" && to.startsWith("/") ? localizePath(to, locale) : to;
  return <Link ref={ref} to={href} {...props} />;
});
AppLink.displayName = "AppLink";

export default AppLink;
