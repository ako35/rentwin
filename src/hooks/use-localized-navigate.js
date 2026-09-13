import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLocale } from "./use-locale";
import { localizePath } from "../i18n/locale-routing";

// Programmatic-navigation counterpart to AppLink — for the few marketing-tree
// spots that call navigate(...) instead of rendering a <Link> (e.g. the
// homepage search bar routing to /vehicles on submit).
export const useLocalizedNavigate = () => {
  const navigate = useNavigate();
  const locale = useLocale();
  return useCallback(
    (to, options) => {
      const target = typeof to === "string" && to.startsWith("/") ? localizePath(to, locale) : to;
      navigate(target, options);
    },
    [navigate, locale]
  );
};
