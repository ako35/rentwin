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

const business = {
  name: "Rentwin",
  email: "info@rentwin.com.tr",
  phoneE164: "+905073503135",
  streetAddress: "Kültür Mah. 260 Sk. No: 3 E",
  addressLocality: "Aliağa",
  addressRegion: "İzmir",
  postalCode: "35800",
  addressCountry: "TR",
  mapUrl: MAPS_URL,
  // Aliağa office coordinates — keep in sync with src/constants/index.js `website.geo`.
  geo: { latitude: 38.8020867, longitude: 26.9715113 },
  // Verified public profiles only — an unverifiable sameAs hurts rich results.
  sameAs: [MAPS_URL],
  openingHours: [
    { days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "09:00", closes: "19:00" },
    { days: ["Saturday"], opens: "09:00", closes: "17:00" },
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

module.exports = { SITE_URL, business, slugify };
