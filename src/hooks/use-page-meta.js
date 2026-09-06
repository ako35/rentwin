import { useEffect } from "react";
import i18n from "../i18n";

// The SPA ships one static <head> in index.html, so without this every route
// showed the same <title>, description, canonical and social card. This hook
// rewrites the per-page tags on mount; each route overwrites the previous one,
// so every public route MUST call it (noindex routes included).
export const SITE_URL = "https://rentwin.com.tr";
const DEFAULT_IMAGE = `${SITE_URL}/logo_full.png`;
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
    const locale = i18n.resolvedLanguage === "en" ? "en_US" : "tr_TR";

    document.title = resolvedTitle;
    setNamed("description", resolvedDesc);
    setNamed("robots", noindex ? "noindex, nofollow" : "index, follow");
    // A non-indexable URL should not point a canonical at itself.
    setCanonical(noindex ? null : url);

    setProperty("og:title", resolvedTitle);
    setProperty("og:description", resolvedDesc);
    setProperty("og:url", url);
    setProperty("og:type", type);
    setProperty("og:image", resolvedImage);
    setProperty("og:locale", locale);
    setNamed("twitter:title", resolvedTitle);
    setNamed("twitter:description", resolvedDesc);
    setNamed("twitter:image", resolvedImage);

    // react-snap reads this to write the right file (200.html vs 404.html).
    if (statusCode) setNamed("render:status_code", String(statusCode));
    return () => {
      const tag = document.head.querySelector('meta[name="render:status_code"]');
      if (tag) tag.remove();
    };
  }, [title, desc, image, canonical, type, noindex, statusCode]);
};
