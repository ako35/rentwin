import { useEffect } from "react";
import i18n from "../i18n";
import { localizePath, stripLocalePrefix } from "../i18n/locale-routing";

// The SPA ships one static <head> in index.html, so without this every route
// showed the same <title>, description, canonical and social card. This hook
// rewrites the per-page tags on mount; each route overwrites the previous one,
// so every public route MUST call it (noindex routes included).
export const SITE_URL = "https://rentwin.com.tr";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;
const DEFAULT_TITLE = "Rentwin | Güvenilir Araç Kiralama";
const DEFAULT_DESCRIPTION =
  "Rentwin ile bakımlı filodan uygun fiyatlı araç kiralayın. Şeffaf fiyat, sorunsuz teslimat, online rezervasyon.";

const absolute = (value, fallback) => {
  if (!value) return fallback;
  return /^https?:\/\//.test(value) ? value : `${SITE_URL}${value.startsWith("/") ? "" : "/"}${value}`;
};

const upsert = (selector, create) => {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el;
};

const setNamed = (name, content) => {
  if (content == null) return;
  upsert(`meta[name="${name}"]`, () => {
    const m = document.createElement("meta");
    m.setAttribute("name", name);
    return m;
  }).setAttribute("content", content);
};

const setProperty = (property, content) => {
  if (content == null) return;
  upsert(`meta[property="${property}"]`, () => {
    const m = document.createElement("meta");
    m.setAttribute("property", property);
    return m;
  }).setAttribute("content", content);
};

const removeProperty = (property) => {
  document.head.querySelector(`meta[property="${property}"]`)?.remove();
};

const setCanonical = (href) => {
  const existing = document.head.querySelector('link[rel="canonical"]');
  if (!href) {
    existing?.remove();
    return;
  }
  (existing ||
    (() => {
      const l = document.createElement("link");
      l.setAttribute("rel", "canonical");
      document.head.appendChild(l);
      return l;
    })()).setAttribute("href", href);
};

const setAlternate = (hreflang, href) => {
  let el = document.head.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "alternate");
    el.setAttribute("hreflang", hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

const removeAlternates = () => {
  document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
};

/**
 * @param {string|object} titleOrOptions  page title, or an options object
 * @param {string} [description]          used only with the (title, description) form
 *
 * Options: { title, description, image, canonical, type = "website",
 *            noindex = false, statusCode }
 */
export const usePageMeta = (titleOrOptions, description) => {
  const options =
    titleOrOptions && typeof titleOrOptions === "object"
      ? titleOrOptions
      : { title: titleOrOptions, description };

  const {
    title,
    description: desc,
    image,
    canonical,
    type = "website",
    noindex = false,
    statusCode,
  } = options;

  useEffect(() => {
    const path =
      window.location.pathname === "/" ? "/" : window.location.pathname.replace(/\/+$/, "");
    const url = absolute(canonical, `${SITE_URL}${path}`);
    const resolvedTitle = title || DEFAULT_TITLE;
    const resolvedDesc = desc || DEFAULT_DESCRIPTION;
    const resolvedImage = absolute(image, DEFAULT_IMAGE);
    // Dimensions are only known for our own brand card — a vehicle/campaign
    // photo can be any aspect ratio, so don't claim 1200x630 for those.
    const usingDefaultImage = resolvedImage === DEFAULT_IMAGE;
    const lang = i18n.resolvedLanguage === "en" ? "en" : "tr";
    const locale = lang === "en" ? "en_US" : "tr_TR";
    const altLocale = lang === "en" ? "tr_TR" : "en_US";

    document.title = resolvedTitle;
    document.documentElement.lang = lang;
    setNamed("description", resolvedDesc);
    setNamed("robots", noindex ? "noindex, nofollow" : "index, follow");
    // A non-indexable URL should not point a canonical at itself.
    setCanonical(noindex ? null : url);

    // hreflang: tell search engines the TR and EN URLs are the same page in
    // two languages. Keyed off the URL, not the `noindex` page's own
    // content, so it stays correct even while e.g. a vehicle is loading.
    if (noindex) {
      removeAlternates();
    } else {
      const canonicalPath = stripLocalePrefix(path);
      setAlternate("tr", `${SITE_URL}${canonicalPath}`);
      setAlternate("en", `${SITE_URL}${localizePath(canonicalPath, "en")}`);
      setAlternate("x-default", `${SITE_URL}${canonicalPath}`);
    }

    setProperty("og:site_name", "Rentwin");
    setProperty("og:title", resolvedTitle);
    setProperty("og:description", resolvedDesc);
    setProperty("og:url", url);
    setProperty("og:type", type);
    setProperty("og:image", resolvedImage);
    setProperty("og:image:alt", resolvedTitle);
    if (usingDefaultImage) {
      setProperty("og:image:width", "1200");
      setProperty("og:image:height", "630");
    } else {
      removeProperty("og:image:width");
      removeProperty("og:image:height");
    }
    setProperty("og:locale", locale);
    setProperty("og:locale:alternate", altLocale);
    setNamed("twitter:card", "summary_large_image");
    setNamed("twitter:title", resolvedTitle);
    setNamed("twitter:description", resolvedDesc);
    setNamed("twitter:image", resolvedImage);
    setNamed("twitter:image:alt", resolvedTitle);

    // react-snap reads this to write the right file (200.html vs 404.html).
    if (statusCode) setNamed("render:status_code", String(statusCode));
    return () => {
      const tag = document.head.querySelector('meta[name="render:status_code"]');
      if (tag) tag.remove();
    };
  }, [title, desc, image, canonical, type, noindex, statusCode]);
};
