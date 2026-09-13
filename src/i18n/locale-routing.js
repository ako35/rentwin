// Shared TR/EN URL-locale helpers. Plain JS (no React) so both the i18n
// bootstrap (src/i18n/index.js, runs before React mounts) and React
// components/hooks can import the exact same logic — no drift between "what
// language should this URL show" in two different places.
//
// Scheme: Turkish is the default and stays unprefixed (existing URLs never
// change — that's what's currently indexed). English gets a literal "/en"
// prefix on the SAME path segments (no per-segment translation, e.g.
// "/en/lokasyonlar", not "/en/locations") — much smaller surface area, and
// avoids two routing tables to maintain.
//
// Only the public marketing tree (home, vehicles, lokasyonlar, kampanyalar,
// about, contact, sss, privacy-policy) is locale-routed this way. The
// account surface (/admin, /auth, /user) is unaffected — it keeps its old
// language *toggle* (persisted, not URL-driven), since none of it is meant
// to be indexed.

export const DEFAULT_LOCALE = "tr";

const ACCOUNT_PATH_PREFIXES = ["/admin", "/auth", "/user"];

// True for any path under the account surface (admin/auth/user), which is
// untouched by URL-based locale routing.
export const isAccountPath = (pathname) =>
  ACCOUNT_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

// "/en" or "/en/..." → "en"; everything else (including account paths, which
// don't use this scheme at all) → the default, "tr".
export const localeFromPath = (pathname) =>
  pathname === "/en" || pathname.startsWith("/en/") ? "en" : DEFAULT_LOCALE;

// `path` is always the canonical, unprefixed (Turkish) form, e.g. "/vehicles"
// or "/" — the shape every route constant and every JSON-LD path already
// uses. Returns the equivalent URL for `locale`.
export const localizePath = (path, locale) => {
  if (locale !== "en") return path;
  return path === "/" ? "/en" : `/en${path}`;
};

// Inverse of localizePath: strips a leading "/en" back to the canonical
// (Turkish) path, e.g. for comparing the current URL against an unprefixed
// route constant.
export const stripLocalePrefix = (pathname) => {
  if (pathname === "/en") return "/";
  if (pathname.startsWith("/en/")) return pathname.slice(3) || "/";
  return pathname;
};
