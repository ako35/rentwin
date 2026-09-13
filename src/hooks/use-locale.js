import { createContext, useContext } from "react";

// Provided by CommonLayout with "tr"/"en" while under the URL-locale-routed
// marketing tree, and left at its default (null) everywhere else — admin,
// auth, and /user pages, which keep the old toggle-based language instead.
// LanguageSwitcher reads the raw context (via LocaleContext) to tell those
// two modes apart; everything else should use the useLocale() convenience
// hook below, which just wants "tr" or "en" to render/link with.
export const LocaleContext = createContext(null);

export const useLocale = () => useContext(LocaleContext) || "tr";
