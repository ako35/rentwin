// Site-wide constants for everything the API renders for search engines and
// social scrapers: the sitemap and the bot prerender (modules/prerender).
//
// The frontend's single source of truth is src/constants/index.js (`website`)
// and src/hooks/use-page-meta.js (SITE_URL). Those are ES modules and cannot be
// required from this CommonJS app, so the handful of fields the API needs are
// mirrored here. If you change an address / phone / geo / social value, change
// it in BOTH places (and in index.html's static JSON-LD).

const SITE_URL = (process.env.PUBLIC_SITE_URL || "https://rentwin.com.tr").replace(/\/+$/, "");

// Google Business Profile place (maps.app.goo.gl/r7VLYXKt7nJjXPuFA resolved).
const MAPS_URL = "https://maps.google.com/?cid=3109543909970773042";

// Rentwin's own social profiles — mirrors src/constants/index.js
// `rentwinSocial`. Only live profiles that carry the same name/address/phone
// as the site; each filled entry joins `sameAs`.
const SOCIAL = {
  facebook: "https://www.facebook.com/rentwin.aliaga",
  instagram: "",
  youtube: "",
  x: "",
};

const business = {
  name: "Rentwin",
  email: "info@rentwin.com.tr",
  phoneE164: "+905073503135",
  // 2026-10-14: corrected to match src/constants/index.js — was the stale
  // "Kültür Mah. 260 Sk. No: 3 E" (see that file's comment for why).
  streetAddress: "Atatürk Mah. 356 Sk. No: 16/31",
  addressLocality: "Aliağa",
  addressRegion: "İzmir",
  postalCode: "35800",
  addressCountry: "TR",
  mapUrl: MAPS_URL,
  // Keep in sync with src/constants/index.js `website.geo` and the confirmed address.
  geo: { latitude: 38.7928859, longitude: 26.9683881 },
  social: SOCIAL,
  // Verified public profiles only — an unverifiable sameAs hurts rich results.
  sameAs: [MAPS_URL, ...Object.values(SOCIAL).filter(Boolean)],
  openingHours: [
    { days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "09:00", closes: "21:00" },
    { days: ["Saturday"], opens: "09:00", closes: "19:00" },
    { days: ["Sunday"], opens: "09:00", closes: "17:00" },
  ],
};

// URL slug from a display name — mirrors src/utils/functions/functions.js
// slugify (and the copy in modules/sitemap) so location landing-page URLs match
// what the SPA links to. Turkish letters are folded to ASCII.
const slugify = (value = "") => {
  const map = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", İ: "i", I: "i" };
  return value
    .toString()
    .trim()
    .replace(/[çğıöşüİI]/g, (c) => map[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// TR/EN URL-locale helpers — mirrors src/i18n/locale-routing.js (frontend
// ESM copy). Same scheme: TR is unprefixed/canonical, EN is the identical
// path under a literal "/en" prefix. Used by the bot prerender to detect
// which language a request path wants, and by breadcrumbLd/vehicleLd/
// itemListLd below to localize the URLs they emit.
const localeFromPath = (path) => (path === "/en" || path.startsWith("/en/") ? "en" : "tr");

const localizePath = (path, locale) => {
  if (locale !== "en") return path;
  return path === "/" ? "/en" : `/en${path}`;
};

const stripLocalePrefix = (path) => {
  if (path === "/en") return "/";
  if (path.startsWith("/en/")) return path.slice(3) || "/";
  return path;
};

module.exports = { SITE_URL, business, slugify, localeFromPath, localizePath, stripLocalePrefix };
