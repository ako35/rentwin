// Backend port of src/utils/seo.js + the per-route <head> copy that lives in the
// page components' usePageMeta(...) calls and the i18n locale files
// (src/i18n/locales/{tr,en}/*.json). Used only by the bot prerender
// (modules/prerender) so crawlers and social scrapers that do not run JS get the
// same title / description / canonical / OG tags / JSON-LD a browser ends up
// with after React hydrates — in either language: everything here is
// locale-aware off the request path's "/en" prefix (see lib/site.js
// localeFromPath/localizePath/stripLocalePrefix, mirroring
// src/i18n/locale-routing.js).
//
// KEEP IN SYNC with the frontend. When you change a page's seoTitle /
// seoDescription in a locale file, or a JSON-LD shape in src/utils/seo.js,
// mirror it here — in BOTH the tr and en copies below.
//
// One real limitation: admin-authored content (a campaign's own title/
// description, a vehicle's free-text color) has no English translation
// anywhere in the system, so it stays Turkish even inside an /en/* page —
// only the surrounding page chrome (titles, labels, breadcrumbs) is bilingual.

const { SITE_URL, business, slugify, localeFromPath, localizePath, stripLocalePrefix } = require("./site");
const { getModelCopy, groupFleetByModel } = require("./vehicle-models");
const HOME_COPY = {
  tr: require("../../../src/i18n/locales/tr/home.json"),
  en: require("../../../src/i18n/locales/en/home.json"),
};
const PRIVACY_POLICY_COPY = {
  tr: require("../../../src/i18n/locales/tr/common.json").privacyPolicy,
  en: require("../../../src/i18n/locales/en/common.json").privacyPolicy,
};
// Service landing pages — read straight from the frontend locale files, so
// there is no second copy of this text to keep in sync.
const LANDING_COPY = {
  tr: require("../../../src/i18n/locales/tr/landing.json"),
  en: require("../../../src/i18n/locales/en/landing.json"),
};
const CARD_COPY = {
  tr: require("../../../src/i18n/locales/tr/vehicles.json").card,
  en: require("../../../src/i18n/locales/en/vehicles.json").card,
};

const ORG_ID = `${SITE_URL}/#organization`;
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

/* ------------------------------------------------------------------ JSON-LD */

// reviewSummary: { count, average } | null (null until the first approved
// review exists — Google's guidance is to never emit AggregateRating with
// zero reviews). reviews: latest approved Review rows (already name-masked
// by reviews/reviews.shared.js), used to embed individual Review nodes.
const autoRentalLd = ({ reviewSummary, reviews } = {}) => ({
  "@context": "https://schema.org",
  "@type": "AutoRental",
  "@id": ORG_ID,
  name: business.name,
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/logo_full.png`,
  image: `${SITE_URL}/logo_full.png`,
  // Was only in the now-deleted static index.html AutoRental block — restored
  // here so nothing regresses now that this is the only place it's rendered.
  description:
    "Aliağa ve İzmir'de bakımlı filodan uygun fiyatlı araç kiralama. Şeffaf fiyat, sorunsuz teslimat.",
  email: business.email,
  telephone: business.phoneE164,
  address: {
    "@type": "PostalAddress",
    streetAddress: business.streetAddress,
    addressLocality: business.addressLocality,
    addressRegion: business.addressRegion,
    postalCode: business.postalCode,
    addressCountry: business.addressCountry,
  },
  ...(business.geo
    ? {
        geo: {
          "@type": "GeoCoordinates",
          latitude: business.geo.latitude,
          longitude: business.geo.longitude,
        },
      }
    : {}),
  hasMap: business.mapUrl,
  areaServed: [
    { "@type": "State", name: "İzmir" },
    { "@type": "Country", name: "Türkiye" },
  ],
  priceRange: "₺₺",
  currenciesAccepted: "TRY",
  openingHoursSpecification: business.openingHours.map((slot) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: slot.days,
    opens: slot.opens,
    closes: slot.closes,
  })),
  ...(business.sameAs.length ? { sameAs: business.sameAs } : {}),
  ...(reviewSummary
    ? {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: reviewSummary.average,
          reviewCount: reviewSummary.count,
          bestRating: 5,
          worstRating: 1,
        },
      }
    : {}),
  ...(reviews && reviews.length ? { review: reviews.map(reviewLd) } : {}),
});

const webSiteLd = (locale = "tr") => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: `${SITE_URL}${localizePath("/", locale)}`,
  name: business.name,
  inLanguage: locale === "en" ? "en-US" : "tr-TR",
  publisher: { "@id": ORG_ID },
});

const breadcrumbLd = (items, locale = "tr") => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    ...(item.path ? { item: `${SITE_URL}${localizePath(item.path, locale)}` } : {}),
  })),
});

const faqLd = (items) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
});

// A listing page's contents. `itemListElement` is a ready array of ListItem
// objects (summary form: position + url to each item's own page; or plain
// position + name when the items have no detail page).
const itemListLd = ({ name, itemListElement }) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name,
  numberOfItems: itemListElement.length,
  itemListElement,
});

// A service landing page — mirrors src/utils/seo.js serviceLd.
const serviceLd = ({ name, serviceType, description, path, locale = "tr" }) => ({
  "@context": "https://schema.org",
  "@type": "Service",
  name,
  serviceType,
  description,
  url: `${SITE_URL}${localizePath(path, locale)}`,
  provider: { "@type": "AutoRental", "@id": ORG_ID, name: business.name },
  areaServed: [
    { "@type": "City", name: "Aliağa" },
    { "@type": "City", name: "İzmir" },
  ],
});

const vehicleLd = ({ name, brand, model, image, transmission, fuelType, modelYear, color, dailyPrice, path, locale = "tr" }) => ({
  "@context": "https://schema.org",
  "@type": "Car",
  name,
  ...(brand ? { brand: { "@type": "Brand", name: brand } } : {}),
  ...(model ? { model } : {}),
  ...(image ? { image } : {}),
  ...(transmission ? { vehicleTransmission: transmission } : {}),
  ...(fuelType ? { fuelType } : {}),
  ...(modelYear ? { vehicleModelDate: String(modelYear) } : {}),
  ...(color ? { color } : {}),
  itemCondition: "https://schema.org/UsedCondition",
  url: `${SITE_URL}${localizePath(path, locale)}`,
  offers: {
    "@type": "Offer",
    availability: "https://schema.org/InStock",
    priceCurrency: "TRY",
    // List prices (daily and monthly) are VAT-exclusive; the page shows "+ KDV".
    ...(dailyPrice
      ? {
          price: dailyPrice,
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: dailyPrice,
            priceCurrency: "TRY",
            unitCode: "DAY",
            valueAddedTaxIncluded: false,
          },
        }
      : {}),
    businessFunction: "https://schema.org/LeaseOut",
    seller: { "@id": ORG_ID },
  },
});

// Blog posts are Turkish-only (no translation fields on BlogPost), so the
// article always points at its TR URL — the same URL both /blog/:slug and
// /en/blog/:slug canonicalize to.
const articleLd = ({ title, excerpt, image, publishedAt, updatedAt, path }) => ({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: title,
  description: excerpt,
  inLanguage: "tr-TR",
  ...(image ? { image } : {}),
  datePublished: new Date(publishedAt).toISOString(),
  dateModified: new Date(updatedAt || publishedAt).toISOString(),
  author: { "@id": ORG_ID },
  publisher: { "@id": ORG_ID },
  mainEntityOfPage: `${SITE_URL}${path}`,
});

// Embedded inside autoRentalLd()'s `review` array — never emitted on its own.
const reviewLd = ({ name, rating, body, createdAt }) => ({
  "@type": "Review",
  author: { "@type": "Person", name },
  reviewRating: { "@type": "Rating", ratingValue: rating, bestRating: 5, worstRating: 1 },
  reviewBody: body,
  datePublished: new Date(createdAt).toISOString(),
});

/* --------------------------------------------------- per-route <head> copy  */
// Mirrors src/i18n/locales/{tr,en}/{home,vehicles,locations,about,contact,faq}.json
// and locales/{tr,en}/common.json (privacyPolicy + nav labels).

const NAV = {
  tr: { home: "Ana Sayfa", vehicles: "Araçlar" },
  en: { home: "Home", vehicles: "Vehicles" },
};

const FAQ_ITEMS = {
  tr: [
    {
      q: "Araç kiralamak için kaç yaşında olmalıyım?",
      a: "Araç kiralayabilmek için en az 25 yaşında olmanız ve en az 3 yıllık sürücü belgesine sahip olmanız gerekir.",
    },
    {
      q: "Kiralama için hangi belgeler gerekli?",
      a: "Geçerli bir sürücü belgesi, T.C. kimlik kartı (yabancı uyruklular için pasaport) ve kiralayan kişi adına bir kredi kartı yeterlidir.",
    },
    {
      q: "Depozito alıyor musunuz?",
      a: "Hayır. Rentwin'de araç kiralarken depozito talep etmiyoruz.",
    },
    {
      q: "Kilometre sınırı var mı?",
      a: "Günlük kiralamalarda kilometre limiti 300 km'dir. Daha uzun yolculuklar için sınırsız kilometre seçeneğini rezervasyon sırasında talep edebilirsiniz. Limiti aşan her kilometre 6 TL üzerinden ücretlendirilir.",
    },
    {
      q: "Yakıt politikanız nedir?",
      a: "Araçlar, deposu ne kadar dolu teslim edildiyse aynı seviyede iade edilmelidir. Eksik yakıt, sözleşmedeki birim fiyat üzerinden faturaya yansıtılır.",
    },
    {
      q: "Köprü ve otoyol (HGS / OGS) geçişleri nasıl ücretlendirilir?",
      a: "Kiralama süresi boyunca yapılan HGS / OGS geçişleri, araç iadesinden sonra sistem üzerinden sorgulanır ve tespit edilen tutar tarafınıza fatura edilir.",
    },
    {
      q: "Aracı başka bir şehirde teslim edebilir miyim?",
      a: "Evet, farklı lokasyonda teslim (tek yön kiralama) mümkündür. Bu hizmet için sözleşmeye tek yön ücreti eklenir; detaylar için bizimle iletişime geçin.",
    },
    {
      q: "Havalimanına teslim yapıyor musunuz?",
      a: "Evet. İzmir Adnan Menderes Havalimanı'na araç teslimi ve karşılama hizmeti veriyoruz. Talebinizi rezervasyon sırasında belirtmeniz yeterli. Belirttiğiniz bir adrese teslim için de bizimle iletişime geçebilirsiniz.",
    },
    {
      q: "Sözleşmeye ek sürücü ekleyebilir miyim?",
      a: "Evet. Aracı kullanacak tüm sürücüler sözleşmede yer almalıdır ve her biri asgari yaş ile ehliyet süresi şartlarını sağlamalıdır.",
    },
    {
      q: "Rezervasyonumu nasıl iptal eder veya değiştiririm?",
      a: "Rezervasyonunuzu telefon, e-posta veya WhatsApp üzerinden iptal edebilir ya da tarih / araç değişikliği talep edebilirsiniz. Alış saatine 24 saatten fazla süre varken yapılan iptaller ücretsizdir.",
    },
    {
      q: "Kaza veya arıza durumunda ne yapmalıyım?",
      a: "Önce güvenliğinizi sağlayın, kaza durumunda kaza tespit tutanağı düzenleyin ve 7/24 yol yardım hattımızı arayın. Ekibimiz süreç boyunca size yardımcı olur.",
    },
    {
      q: "Araçları yurt dışına çıkarabilir miyim?",
      a: "Hayır. Rentwin araçları Türkiye sınırları dışına çıkarılamaz.",
    },
    {
      q: "Hangi ödeme yöntemlerini kabul ediyorsunuz?",
      a: "Nakit, kredi kartı ve havale / EFT ile ödeme yapabilirsiniz.",
    },
  ],
  en: [
    {
      q: "What is the minimum age to rent a car?",
      a: "You must be at least 25 years old and have held a driving licence for at least 3 years.",
    },
    {
      q: "Which documents do I need to rent?",
      a: "A valid driving licence, a national ID card (passport for non-Turkish citizens) and a credit card in the renter's name.",
    },
    {
      q: "Do you take a deposit?",
      a: "No. Rentwin does not require a deposit when you rent a car.",
    },
    {
      q: "Is there a mileage limit?",
      a: "Daily rentals have a 300 km mileage limit. For longer trips you can request the unlimited-mileage option when booking. Every kilometre over the limit is charged at 6 TL.",
    },
    {
      q: "What is your fuel policy?",
      a: "Return the car with the fuel at the same level it was handed over. Any shortfall is billed at the unit price stated in the rental agreement.",
    },
    {
      q: "How are bridge and motorway (HGS / OGS) tolls charged?",
      a: "Tolls incurred during the rental are queried through the system after the car is returned, and the amount found is invoiced to you.",
    },
    {
      q: "Can I drop the car off in another city?",
      a: "Yes, one-way rentals are possible. A one-way fee is added to the agreement for this; contact us for the details.",
    },
    {
      q: "Do you deliver to the airport?",
      a: "Yes. We deliver cars to İzmir Adnan Menderes Airport with a meet-and-greet service — just note the request when booking. Contact us for delivery to an address you specify as well.",
    },
    {
      q: "Can I add an extra driver to the agreement?",
      a: "Yes. Every driver who will use the car must be listed on the agreement and must each meet the minimum age and licence requirements.",
    },
    {
      q: "How do I cancel or change my reservation?",
      a: "You can cancel your reservation, or request a date / vehicle change, by phone, e-mail or WhatsApp. Cancellations made more than 24 hours before pick-up are free of charge.",
    },
    {
      q: "What should I do in an accident or breakdown?",
      a: "Make sure you are safe first, file an accident report if there is a collision, and call our 24/7 roadside assistance line. Our team will help you through the process.",
    },
    {
      q: "Can I take the car outside Turkey?",
      a: "No. Rentwin vehicles may not be taken outside Turkey's borders.",
    },
    {
      q: "Which payment methods do you accept?",
      a: "Cash, credit card and bank transfer.",
    },
  ],
};

/* --------------------------------------------- /kampanyalar crawler body  */
// Mirrors src/i18n/locales/{tr,en}/campaigns.json and the markup of
// src/pages/common/campaigns/page.jsx + campaign-card.jsx. The prerender drops
// this inside #root so JS-less crawlers and social scrapers read real page
// chrome instead of an empty SPA shell. Each *campaign*'s own title/
// description is admin-authored Turkish content with no translation anywhere
// in the system, so it stays Turkish even in the English chrome — see the
// file-top note. KEEP IN SYNC with the locale files.

const CAMPAIGNS_COPY = {
  tr: {
    pageTitle: "Kampanyalar",
    intro:
      "Rentwin'in güncel kiralama kampanyaları ve indirim fırsatları burada. Detayları inceleyin, avantajlı fiyatlarla aracınızı ayırtın.",
    empty: "Şu anda yayında olan bir kampanya bulunmuyor. Yeni fırsatlar için takipte kalın.",
    cta: "Detaylar",
    validUntil: (date) => `${date} tarihine kadar geçerli`,
    validBetween: (start, end) => `${start} – ${end} arası geçerli`,
  },
  en: {
    pageTitle: "Campaigns",
    intro:
      "Rentwin's current rental campaigns and discount deals are here. Check the details and book your car at advantageous prices.",
    empty: "There are no active campaigns right now. Stay tuned for new deals.",
    cta: "Details",
    validUntil: (date) => `Valid until ${date}`,
    validBetween: (start, end) => `Valid ${start} – ${end}`,
  },
};

const htmlEsc = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const formatDate = (value, locale) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(locale === "en" ? "en-GB" : "tr-TR");
};

const campaignValidity = ({ startsAt, endsAt }, locale) => {
  const copy = CAMPAIGNS_COPY[locale];
  if (startsAt && endsAt) return copy.validBetween(formatDate(startsAt, locale), formatDate(endsAt, locale));
  if (endsAt) return copy.validUntil(formatDate(endsAt, locale));
  return "";
};

// campaigns: [{ title, description, image, ctaLabel, ctaUrl, startsAt, endsAt }]
const renderCampaignsBody = (campaigns = [], locale = "tr") => {
  const copy = CAMPAIGNS_COPY[locale];
  const cards = campaigns
    .map((c) => {
      const validity = campaignValidity(c, locale);
      let cta = "";
      if (c.ctaUrl && /^https?:\/\//i.test(c.ctaUrl)) {
        cta = `<a href="${htmlEsc(c.ctaUrl)}" rel="noopener nofollow">${htmlEsc(c.ctaLabel || copy.cta)}</a>`;
      } else if (c.ctaUrl && c.ctaUrl.startsWith("/")) {
        cta = `<a href="${htmlEsc(SITE_URL + localizePath(c.ctaUrl, locale))}">${htmlEsc(c.ctaLabel || copy.cta)}</a>`;
      }
      return (
        "<li><article>" +
        `<h2>${htmlEsc(c.title)}</h2>` +
        (validity ? `<p>${htmlEsc(validity)}</p>` : "") +
        `<p>${htmlEsc(c.description)}</p>` +
        (c.image ? `<img src="${htmlEsc(c.image)}" alt="${htmlEsc(c.title)}" loading="lazy" />` : "") +
        cta +
        "</article></li>"
      );
    })
    .join("");
  return (
    `<main><h1>${htmlEsc(copy.pageTitle)}</h1>` +
    `<p>${htmlEsc(copy.intro)}</p>` +
    (cards ? `<ul>${cards}</ul>` : `<p>${htmlEsc(copy.empty)}</p>`) +
    "</main>"
  );
};

/* --------------------------------------- /vehicles/:id crawler body  */
// Every other route's #root ships empty to a JS-less crawler (see the
// ROOT_OPEN comment in modules/prerender/prerender.controller.js) — fine for
// a bot that renders JS (modern Googlebot does, in a second pass), but a
// pile of identically-empty bodies differing only by <head> tags is exactly
// what makes near-duplicate-content heuristics fold distinct vehicle/location
// pages into one another before that render pass ever happens. This renders
// real text for the two page types that matter most for that (vehicle
// detail, location detail) — mirrors src/components/common/vehicles/
// details-panel/details-panel.jsx + src/pages/common/vehicles/details/page.jsx
// and src/i18n/locales/{tr,en}/vehicles.json `details.*`. KEEP IN SYNC.

const TRANSMISSION_LABELS = {
  tr: { Manual: "Manuel", SemiAutomatic: "Yarı Otomatik", Automatic: "Otomatik" },
  en: { Manual: "Manual", SemiAutomatic: "Semi-Automatic", Automatic: "Automatic" },
};
const FUEL_LABELS = {
  tr: { Diesel: "Dizel", Gasoline: "Benzin", Hybrid: "Hibrit", Electricity: "Elektrik", LPG: "LPG", CNG: "CNG", Hydrogen: "Hidrojen" },
  en: { Diesel: "Diesel", Gasoline: "Gasoline", Hybrid: "Hybrid", Electricity: "Electricity", LPG: "LPG", CNG: "CNG", Hydrogen: "Hydrogen" },
};

const VEHICLE_DETAIL_COPY = {
  tr: {
    highlightsTitle: "Öne Çıkan Özellikler",
    modelLabel: "Model",
    transmissionLabel: "Vites",
    fuelLabel: "Yakıt Tipi",
    dailyPriceLabel: "Günlük Fiyat",
    monthlyPriceLabel: "Aylık Fiyat",
    vatSuffix: "+ KDV",
    relatedTitle: "Benzer Araçlar",
    idealForTitle: (name) => `${name} kimler için uygun?`,
    fleetTitle: (name) => `Filomuzdaki ${name} araçlar`,
    variants: ({ count, name, years, transmissions, fuels }) =>
      `Rentwin filosunda ${count} adet ${name} bulunuyor${years ? `: ${years} model` : ""}, ${transmissions} vites ve ${fuels} yakıt seçenekleriyle. Rezervasyonda müsait olan aracı seçebilirsiniz.`,
    description: ({ brand, model, transmission, fuel }) =>
      `${brand} ${model}, Rentwin filosunda ${transmission} vites ve ${fuel} yakıt seçeneğiyle hizmetinizde. Aliağa ve İzmir genelinde teslim alınabilen bu araç, bakımları tamamlanmış ve kullanıma hazır durumdadır.`,
    descriptionWithYear: ({ year, brand, model, transmission, fuel }) =>
      `${year} model ${brand} ${model}, Rentwin filosunda ${transmission} vites ve ${fuel} yakıt seçeneğiyle hizmetinizde. Aliağa ve İzmir genelinde teslim alınabilen bu araç, bakımları tamamlanmış ve kullanıma hazır durumdadır.`,
  },
  en: {
    highlightsTitle: "Key Features",
    modelLabel: "Model",
    transmissionLabel: "Transmission",
    fuelLabel: "Fuel Type",
    dailyPriceLabel: "Daily Price",
    monthlyPriceLabel: "Monthly Price",
    vatSuffix: "+ VAT",
    relatedTitle: "Similar Vehicles",
    idealForTitle: (name) => `Who is the ${name} for?`,
    fleetTitle: (name) => `${name} in our fleet`,
    variants: ({ count, name, years, transmissions, fuels }) =>
      `The Rentwin fleet has ${count} ${name} vehicles${years ? ` (${years} models)` : ""}, with ${transmissions} transmission and ${fuels} fuel. You can choose whichever unit is available when you book.`,
    description: ({ brand, model, transmission, fuel }) =>
      `The ${brand} ${model} is part of the Rentwin fleet, available with ${transmission} transmission and ${fuel} fuel. Available for pickup across Aliağa and İzmir, this vehicle is fully serviced and ready to drive.`,
    descriptionWithYear: ({ year, brand, model, transmission, fuel }) =>
      `The ${year} ${brand} ${model} is part of the Rentwin fleet, available with ${transmission} transmission and ${fuel} fuel. Available for pickup across Aliağa and İzmir, this vehicle is fully serviced and ready to drive.`,
  },
};

// The "N units of this model: 2022–2025, Manual and Automatic …" sentence —
// only when the fleet holds more than one unit of the model (for a single
// unit the description above already says it all). Mirrors
// details-panel.jsx's formatVariants. variants: lib/vehicle-models.js
// summarizeVariants() output.
const formatVariants = (variants, name, locale = "tr") => {
  if (!variants || variants.count < 2) return "";
  const list = new Intl.ListFormat(locale === "en" ? "en" : "tr", { type: "conjunction" });
  const years =
    variants.minYear == null
      ? ""
      : variants.minYear === variants.maxYear
        ? String(variants.minYear)
        : `${variants.minYear}–${variants.maxYear}`;
  return VEHICLE_DETAIL_COPY[locale].variants({
    count: variants.count,
    name,
    years,
    transmissions: list.format(variants.transmissions.map((t) => TRANSMISSION_LABELS[locale][t] || t)),
    fuels: list.format(variants.fuelTypes.map((f) => FUEL_LABELS[locale][f] || f)),
  });
};

// vehicle: { name, brand, model, transmission, fuelType, modelYear, variants }
// (raw enum values, labeled here); related: [{ id, name }] — other models'
// canonical pages, same purpose as the frontend's "Benzer Araçlar" section
// (internal link discovery for a crawler that never runs the client fetch).
const renderVehicleDetailBody = ({ vehicle, related = [] }, locale = "tr") => {
  const copy = VEHICLE_DETAIL_COPY[locale];
  const transmissionLabel = TRANSMISSION_LABELS[locale][vehicle.transmission] || vehicle.transmission || "";
  const fuelLabel = FUEL_LABELS[locale][vehicle.fuelType] || vehicle.fuelType || "";
  const descArgs = {
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.modelYear,
    transmission: transmissionLabel,
    fuel: fuelLabel,
  };
  const description = vehicle.modelYear ? copy.descriptionWithYear(descArgs) : copy.description(descArgs);
  const name = `${vehicle.brand} ${vehicle.model}`.trim();
  // Model-level copy (lib/vehicle-models.js MODEL_COPY) — what makes one
  // model's page read differently from another's.
  const modelCopy = getModelCopy(vehicle.brand, vehicle.model)?.[locale];
  const modelSection = modelCopy
    ? `<p>${htmlEsc(modelCopy.summary)}</p>` +
      `<h2>${htmlEsc(copy.idealForTitle(name))}</h2>` +
      `<ul>${modelCopy.idealFor.map((i) => `<li>${htmlEsc(i)}</li>`).join("")}</ul>`
    : "";
  const variantsText = formatVariants(vehicle.variants, name, locale);
  const fleetSection = variantsText ? `<h2>${htmlEsc(copy.fleetTitle(name))}</h2><p>${htmlEsc(variantsText)}</p>` : "";
  const relatedList = related.length
    ? `<h2>${htmlEsc(copy.relatedTitle)}</h2><ul>${related
        .map(
          (r) =>
            `<li><a href="${htmlEsc(`${SITE_URL}${localizePath(`/vehicles/${r.id}`, locale)}`)}">${htmlEsc(r.name)}</a></li>`
        )
        .join("")}</ul>`
    : "";
  const priceItems =
    (vehicle.dailyPrice
      ? `<li>${htmlEsc(copy.dailyPriceLabel)}: ${htmlEsc(`${Number(vehicle.dailyPrice).toLocaleString("tr-TR")} TL ${copy.vatSuffix}`)}</li>`
      : "") +
    (vehicle.monthlyPrice
      ? `<li>${htmlEsc(copy.monthlyPriceLabel)}: ${htmlEsc(`${Number(vehicle.monthlyPrice).toLocaleString("tr-TR")} TL ${copy.vatSuffix}`)}</li>`
      : "");

  return (
    `<main><h1>${htmlEsc(vehicle.name)}</h1>` +
    `<p>${htmlEsc(description)}</p>` +
    modelSection +
    `<h2>${htmlEsc(copy.highlightsTitle)}</h2>` +
    "<ul>" +
    `<li>${htmlEsc(copy.modelLabel)}: ${htmlEsc(`${vehicle.brand} ${vehicle.model}`.trim())}</li>` +
    `<li>${htmlEsc(copy.transmissionLabel)}: ${htmlEsc(transmissionLabel)}</li>` +
    `<li>${htmlEsc(copy.fuelLabel)}: ${htmlEsc(fuelLabel)}</li>` +
    priceItems +
    "</ul>" +
    fleetSection +
    relatedList +
    "</main>"
  );
};

/* ------------------------------------- /lokasyonlar/:slug crawler body  */
// Mirrors src/pages/common/locations/details/page.jsx +
// src/i18n/locales/{tr,en}/locations.json `detail.*`. KEEP IN SYNC.

const LOCATIONS_COPY = {
  tr: {
    heading: (n) => `${n} Araç Kiralama`,
    lead: (n) =>
      `${n} bölgesinde araç mı kiralamak istiyorsunuz? Rentwin'in bakımlı filosuyla ${n} ve çevresinde şehir içi, iş ve tatil seyahatleriniz için doğru aracı kolayca bulabilirsiniz. Şeffaf fiyatlandırma, sorunsuz teslimat ve 7/24 destek.`,
    whyTitle: (n) => `${n} için neden Rentwin?`,
    why: (n) => [
      "Bakımlı ve sigortalı geniş araç filosu",
      "Ek ücret sürprizi olmayan şeffaf fiyatlandırma",
      `${n} için teslimat noktası rezervasyonla belirlenir`,
      "Online rezervasyon ve esnek iptal koşulları",
    ],
    howTitle: (n) => `${n} lokasyonundan kiralama nasıl işler?`,
    how: (n) => [
      `Alış–bırakış tarih ve saatlerinizi seçip ${n} için müsait araçları listeleyin.`,
      "Aracınızı ve ek hizmetleri (havalimanı karşılama, tek yön kiralama, ek sürücü) belirleyip rezervasyonu oluşturun.",
      `${n} için belirlenen teslimat noktasında kimlik, ehliyet ve kart ile aracınızı teslim alın; depozito talep edilmez.`,
    ],
  },
  en: {
    heading: (n) => `Car Rental in ${n}`,
    lead: (n) =>
      `Looking to rent a car in ${n}? With Rentwin's well-kept fleet you can easily find the right vehicle for city, business, and holiday trips in and around ${n}. Transparent pricing, smooth handover, and 24/7 support.`,
    whyTitle: (n) => `Why Rentwin for ${n}?`,
    why: (n) => [
      "A large fleet of maintained, insured vehicles",
      "Transparent pricing with no surprise fees",
      `The handover point in ${n} is agreed when you book`,
      "Online booking with flexible cancellation",
    ],
    howTitle: (n) => `How does renting from ${n} work?`,
    how: (n) => [
      `Choose your pick-up and drop-off dates and times to list the cars available at ${n}.`,
      "Select your car and any extras (airport meet-and-greet, one-way rental, additional driver) and place the booking.",
      `Receive your car at the agreed handover point in ${n} with your ID, licence, and card — no deposit required.`,
    ],
  },
};

// Per-slug copy — mirrors locations.json `detail.local.*`. `lead`, `why` and
// `how` replace LOCATIONS_COPY's shared template for that slug: with only the
// city name swapped in, the location pages were ~35% identical and Search
// Console folded Aliağa and İzmir Havalimanı into Bursa ("Duplicate, Google
// chose different canonical than user").
const LOCATION_LOCAL_COPY = {
  tr: {
    aliaga: {
      title: "Aliağa'da araç kiralama hakkında",
      lead:
        "Aliağa, Rentwin'in merkez ofisinin bulunduğu yer. Aracınızı Atatürk Mahallesi'ndeki ofisimizden teslim alabilir, Aliağa'daki iş ve tatil yolculuklarınıza doğrudan buradan başlayabilirsiniz.",
      why: [
        "Atatürk Mah. 356 Sk.'deki ofisimizden aracınızı doğrudan teslim alabilirsiniz",
        "Ofisimiz haftanın 7 günü açık: hafta içi 09:00–21:00, Cumartesi 09:00–19:00, Pazar 09:00–17:00",
        "Sanayi bölgesindeki işler için binek araçların yanında panelvan ve çift kabin seçenekleri",
        "Kısa süreli kiralamanın yanında aylık kiralama seçenekleri",
      ],
      how: [
        "Alış–bırakış tarih ve saatlerinizi seçip Aliağa ofisindeki müsait araçları listeleyin.",
        "Aracınızı ve ek hizmetleri belirleyip rezervasyonu oluşturun.",
        "Ofis saatleri içinde kimlik, ehliyet ve kartınızla ofisimize gelip aracınızı teslim alın; depozito talep edilmez.",
      ],
      paragraphs: [
        "Aliağa'daki Rentwin ofisi Atatürk Mah. 356 Sk. No: 16/31, 35800 Aliağa/İzmir adresindedir. STAR Rafineri, Petkim ve liman tesislerine iş seyahati için gelenler, rezervasyonla araç teslim alabilir.",
        "Aliağa'dan Foça, Yeni Foça ve Çandarlı yönüne seyahat edebilir; İzmir Adnan Menderes Havalimanı'nda teslim ve karşılama talep edebilirsiniz. Ofis saatleri: Pazartesi–Cuma 09:00–21:00, Cumartesi 09:00–19:00, Pazar 09:00–17:00.",
      ],
      faqTitle: "Aliağa'da araç kiralama: sık sorulan sorular",
      faq: [
        {
          q: "Aliağa'da aracı nereden teslim alırım?",
          a: "Aracınızı Atatürk Mah. 356 Sk. No: 16/31, 35800 Aliağa/İzmir adresindeki ofisimizden, ofis saatleri içinde teslim alabilirsiniz. Belirttiğiniz bir adrese teslim için bizimle iletişime geçebilirsiniz.",
        },
        {
          q: "STAR Rafineri, Petkim veya liman bölgesindeki bir iş için araç kiralayabilir miyim?",
          a: "Evet. Bu bölgelere iş seyahatiyle gelenler rezervasyonla aracını Aliağa ofisimizden teslim alabilir. Saha işleri için binek araçların yanında panelvan ve çift kabin seçeneklerimiz de var.",
        },
        {
          q: "Aliağa'da aylık araç kiralama yapıyor musunuz?",
          a: "Evet. Kısa süreli kiralamanın yanında aylık kiralama seçeneklerimiz var. Fiyatlarımız KDV hariçtir; güncel aylık teklif için 0507 350 31 35 numarasını arayabilir ya da WhatsApp'tan yazabilirsiniz.",
        },
        {
          q: "Aliağa'dan İzmir Adnan Menderes Havalimanı'na araç teslimi yapıyor musunuz?",
          a: "Evet. Havalimanında araç teslimi ve karşılama hizmeti veriyoruz; talebinizi rezervasyon sırasında belirtmeniz yeterli.",
        },
        {
          q: "Aracı Aliağa dışında bir yerde teslim edebilir miyim?",
          a: "Evet, farklı lokasyonda teslim (tek yön kiralama) mümkündür. Bu hizmet için sözleşmeye tek yön ücreti eklenir; ayrıntılar için bizimle iletişime geçin.",
        },
        {
          q: "Kiralamak için neler gerekiyor, depozito alıyor musunuz?",
          a: "En az 25 yaşında olmanız ve en az 3 yıllık sürücü belgeniz olması gerekir. Geçerli sürücü belgesi, T.C. kimlik kartı (yabancı uyruklular için pasaport) ve kiralayan kişi adına kredi kartı yeterlidir. Depozito talep etmiyoruz.",
        },
      ],
    },
    "izmir-havalimani": {
      title: "İzmir Adnan Menderes Havalimanı araç kiralama",
      lead:
        "İzmir'e uçakla geliyorsanız aracınızı İzmir Adnan Menderes Havalimanı'nda teslim alabilirsiniz. Havalimanı teslimi ve karşılama rezervasyon sırasında talep edilir; böylece inişten sonra doğrudan yola çıkabilirsiniz.",
      why: [
        "Havalimanında araç teslimi ve karşılama, rezervasyon sırasında talep edilebilir",
        "Havalimanından Aliağa'ya, İzmir merkezine ve çevre ilçelere doğrudan devam edebilirsiniz",
        "Kalabalık gruplar ve bol bagajlı yolculuklar için geniş araç seçenekleri",
        "Günlük ve aylık kiralama seçenekleri",
      ],
      how: [
        "Alış tarih ve saatinizi seçip rezervasyona havalimanı teslim isteğinizi ekleyin.",
        "Teslim ayrıntıları rezervasyon teyidinizde netleştirilir.",
        "Havalimanında kimlik, ehliyet ve kartınızla aracınızı teslim alın; depozito talep edilmez.",
      ],
      paragraphs: [
        "İzmir Adnan Menderes Havalimanı'nda Rentwin araç teslimi ve karşılama hizmeti rezervasyon sırasında talep edilebilir. Alış tarih ve saatinizi seçip havalimanı teslim isteğinizi ekibimize iletin; teslim ayrıntılarını rezervasyon teyidinde netleştirin.",
        "Havalimanından Aliağa'ya, İzmir merkezine veya çevre ilçelere devam edeceğiniz yolculuk için günlük ya da aylık kiralama seçeneklerini inceleyin. Uygun araçları görmek ve rezervasyon başlatmak için araç listemizi ziyaret edin.",
      ],
    },
    bursa: {
      title: "Bursa'da adrese araç teslimi",
      lead:
        "Bursa'da aracınızı sizinle belirlenen adrese teslim ediyoruz. Teslimat adresini ve saatini rezervasyon talebinizde belirtmeniz yeterli.",
      why: [
        "Araç, Bursa'da sizinle belirlenen adrese teslim edilir",
        "Teslimat adresini ve saatini rezervasyon talebinizde siz belirlersiniz",
        "Şehir içi kullanım için kompakt araçlardan ticari işler için panelvanlara kadar seçenekler",
        "Kısa ve uzun dönem kiralama seçenekleri",
      ],
      how: [
        "Alış–bırakış tarih ve saatlerinizi seçip müsait araçları listeleyin.",
        "Rezervasyon talebinize Bursa'daki teslimat adresinizi ve tercih ettiğiniz saati ekleyin.",
        "Araç belirlenen adrese getirildiğinde kimlik, ehliyet ve kartınızla teslim alın; depozito talep edilmez.",
      ],
      paragraphs: [
        "Bursa'daki Rentwin araç kiralama hizmetinde araç, müşteriyle belirlenen adrese teslim edilir. Rezervasyon talebinizde teslimat adresinizi ve tercih ettiğiniz saati belirtin.",
        "Yola çıkmadan önce araç müsaitliğini ve teslimat ayrıntılarını Rentwin ekibiyle teyit edin. Bursa seyahatinize uygun aracı görmek için araç listemizi inceleyin.",
      ],
    },
  },
  en: {
    aliaga: {
      title: "Renting a car in Aliağa",
      lead:
        "Aliağa is home to Rentwin's main office. Pick up your car at our office in the Atatürk neighbourhood and start your business or holiday trips around Aliağa right from there.",
      why: [
        "Pick up your car directly from our office on 356 Sk., Atatürk Mah.",
        "Our office is open 7 days a week: weekdays 09:00–21:00, Saturday 09:00–19:00, Sunday 09:00–17:00",
        "Panel vans and double-cab vans alongside cars for work in the industrial zone",
        "Monthly rental options as well as short-term hire",
      ],
      how: [
        "Choose your pick-up and drop-off dates and times to list the cars available at the Aliağa office.",
        "Select your car and any extras and place the booking.",
        "Come to our office during opening hours with your ID, licence, and card to collect your car — no deposit required.",
      ],
      paragraphs: [
        "Rentwin's Aliağa office is at Atatürk Mah. 356 Sk. No: 16/31, 35800 Aliağa/İzmir. Visitors travelling for business to STAR Refinery, Petkim, and the port facilities can arrange vehicle pick-up with a reservation.",
        "Travel from Aliağa toward Foça, Yeni Foça, and Çandarlı, or request vehicle delivery and meet-and-greet at İzmir Adnan Menderes Airport. Office hours: Monday–Friday 09:00–21:00, Saturday 09:00–19:00, Sunday 09:00–17:00.",
      ],
      faqTitle: "Renting a car in Aliağa: frequently asked questions",
      faq: [
        {
          q: "Where do I pick up my car in Aliağa?",
          a: "You can collect your car from our office at Atatürk Mah. 356 Sk. No: 16/31, 35800 Aliağa/İzmir during office hours. To have it delivered to an address you choose, contact us.",
        },
        {
          q: "Can I rent a car for work at STAR Refinery, Petkim or the port area?",
          a: "Yes. Visitors travelling for business to these sites can collect their car from our Aliağa office with a reservation. For site work we also offer panel vans and double-cab vans alongside cars.",
        },
        {
          q: "Do you offer monthly car rental in Aliağa?",
          a: "Yes. Alongside short-term hire we offer monthly rental. Our prices exclude VAT; for a current monthly quote call 0507 350 31 35 or message us on WhatsApp.",
        },
        {
          q: "Can you deliver a car from Aliağa to İzmir Adnan Menderes Airport?",
          a: "Yes. We offer vehicle delivery and meet-and-greet at the airport; just mention it when you book.",
        },
        {
          q: "Can I return the car somewhere other than Aliağa?",
          a: "Yes, one-way rental to a different location is possible. A one-way fee is added to the contract; contact us for details.",
        },
        {
          q: "What do I need to rent, and do you take a deposit?",
          a: "You must be at least 25 and have held a driving licence for at least 3 years. A valid driving licence, a Turkish ID card (passport for foreign nationals) and a credit card in the renter's name are enough. We don't take a deposit.",
        },
      ],
    },
    "izmir-havalimani": {
      title: "Car rental at İzmir Adnan Menderes Airport",
      lead:
        "Flying into İzmir? You can collect your car at İzmir Adnan Menderes Airport. Airport delivery and meet-and-greet are requested when you book, so you can hit the road right after landing.",
      why: [
        "Vehicle delivery and meet-and-greet at the airport can be requested when you book",
        "Drive straight on from the airport to Aliağa, central İzmir, and nearby districts",
        "Roomy vehicles for groups and trips with lots of luggage",
        "Daily and monthly rental options",
      ],
      how: [
        "Choose your pick-up date and time and add an airport delivery request to your booking.",
        "Handover details are confirmed in your booking confirmation.",
        "Collect your car at the airport with your ID, licence, and card — no deposit required.",
      ],
      paragraphs: [
        "Vehicle delivery and meet-and-greet at İzmir Adnan Menderes Airport can be requested when you book. Select your pick-up date and time and send the airport request to our team; confirm handover details with your booking confirmation.",
        "Explore daily and monthly rental options for trips from the airport to Aliağa, central İzmir, and nearby districts. Visit our vehicle list to check available cars and start a reservation.",
      ],
    },
    bursa: {
      title: "Car delivery to your address in Bursa",
      lead:
        "In Bursa we deliver your car to an address agreed with you. Just include the delivery address and time in your booking request.",
      why: [
        "The car is delivered to an address in Bursa agreed with you",
        "You set the delivery address and time in your booking request",
        "Options from compact cars for the city to panel vans for business",
        "Short- and long-term rental options",
      ],
      how: [
        "Choose your pick-up and drop-off dates and times to list the available cars.",
        "Add your delivery address in Bursa and preferred time to the booking request.",
        "When the car arrives at the agreed address, collect it with your ID, licence, and card — no deposit required.",
      ],
      paragraphs: [
        "For Rentwin car rentals in Bursa, the vehicle is delivered to an address agreed with the customer. Include your preferred delivery address and time with your booking request.",
        "Before your trip, confirm vehicle availability and delivery details with the Rentwin team. Browse the fleet to choose a vehicle for your time in Bursa.",
      ],
    },
  },
};

// Per-slug <title> / description / H1 overrides — mirrors
// src/i18n/locales/{tr,en}/locations.json detail.overrides. Aliağa is the
// home office and the homepage already targets "Aliağa Araç Kiralama" (see
// STATIC_META "/"); with the same title + H1 on /lokasyonlar/aliaga the two
// pages competed for one query. The Aliağa page now aims at the office
// itself (address, opening hours, pick-up) and leaves the head term to "/".
const LOCATION_META_OVERRIDES = {
  tr: {
    aliaga: {
      title: "Rentwin Aliağa Ofisi | Adres ve Çalışma Saatleri",
      description:
        "Rentwin Aliağa ofisi Atatürk Mah. 356 Sk. No: 16/31, Aliağa/İzmir adresinde, haftanın 7 günü açık. Aracınızı ofisten teslim alın veya havalimanı teslimi isteyin.",
      heading: "Rentwin Aliağa Ofisi",
    },
  },
  en: {
    aliaga: {
      title: "Rentwin Aliağa Office | Address & Opening Hours",
      description:
        "Rentwin's Aliağa office is at Atatürk Mah. 356 Sk. No: 16/31, Aliağa/İzmir and open 7 days a week. Pick up your car at the office or request airport delivery.",
      heading: "Rentwin Aliağa Office",
    },
  },
};

const renderLocationDetailBody = ({ locationName, slug }, locale = "tr") => {
  const copy = LOCATIONS_COPY[locale];
  const local = LOCATION_LOCAL_COPY[locale][slug];
  const override = LOCATION_META_OVERRIDES[locale][slug];
  const list = (items) => `<ul>${items.map((i) => `<li>${htmlEsc(i)}</li>`).join("")}</ul>`;
  const steps = (items) => `<ol>${items.map((i) => `<li>${htmlEsc(i)}</li>`).join("")}</ol>`;
  return (
    `<main><h1>${htmlEsc(override?.heading || copy.heading(locationName))}</h1>` +
    `<p>${htmlEsc(local?.lead || copy.lead(locationName))}</p>` +
    `<h2>${htmlEsc(copy.whyTitle(locationName))}</h2>${list(local?.why || copy.why(locationName))}` +
    `<h2>${htmlEsc(copy.howTitle(locationName))}</h2>${steps(local?.how || copy.how(locationName))}` +
    (local
      ? `<h2>${htmlEsc(local.title)}</h2>${local.paragraphs.map((p) => `<p>${htmlEsc(p)}</p>`).join("")}`
      : "") +
    (local?.faq
      ? `<h2>${htmlEsc(local.faqTitle)}</h2>` +
        local.faq.map((item) => `<h3>${htmlEsc(item.q)}</h3><p>${htmlEsc(item.a)}</p>`).join("")
      : "") +
    `<ul>${htmlLink(`${SITE_URL}${localizePath("/vehicles", locale)}`, locale === "en" ? "Browse available vehicles" : "Müsait araçları inceleyin")}` +
    `${htmlLink(`${SITE_URL}${localizePath("/contact", locale)}`, locale === "en" ? "Contact Rentwin" : "Rentwin ile iletişime geçin")}</ul>` +
    "</main>"
  );
};

/* ------------------------------------------ /blog/:slug crawler body  */
// Mirrors src/pages/common/blog/details/page.jsx. Unlike the vehicle/
// location bodies above, there's no copy to hand-duplicate here — post.content
// is already the real, trusted, admin-authored HTML the frontend drops in
// via dangerouslySetInnerHTML (see blog.controller.js's buildData comment),
// so it goes straight through unescaped, same trust level.
const BLOG_COPY = {
  tr: { publishedOn: (date) => `${date} tarihinde yayınlandı` },
  en: { publishedOn: (date) => `Published on ${date}` },
};

const renderBlogPostBody = ({ post }, locale = "tr") => {
  const copy = BLOG_COPY[locale];
  const dateLocale = locale === "en" ? "en-GB" : "tr-TR";
  const dateStr = new Date(post.publishedAt).toLocaleDateString(dateLocale);
  return (
    `<main><h1>${htmlEsc(post.title)}</h1>` +
    `<p>${htmlEsc(copy.publishedOn(dateStr))}</p>` +
    (post.content || "") +
    "</main>"
  );
};

/* -------------------------- /vehicles, /lokasyonlar, /blog list bodies  */
// Mirrors each page's own intro copy + (for /vehicles) its "about" section,
// plus the same links already summarized in that route's ItemList JSON-LD —
// a crawler that never runs the client fetch still gets a real path to
// every item.

const htmlLink = (url, label) => `<li><a href="${htmlEsc(url)}">${htmlEsc(label)}</a></li>`;

const VEHICLES_LIST_COPY = {
  tr: {
    heading: "Araçlarımız",
    intro: "Aliağa'da günlük ve aylık araç kiralama; İzmir Adnan Menderes Havalimanı'nda teslim ve karşılama talebi. Bakımlı filo ve şeffaf kiralama koşulları.",
    aboutTitle: "Rentwin ile Araç Kiralama",
    aboutParagraphs: [
      "Rentwin'in Aliağa ve İzmir'deki araç filosunda hatchback, sedan, SUV ve ticari araç seçenekleri bulunur. Marka, vites ve yakıt tipine göre filtreleyerek günlük veya aylık kiralama için uygun aracı seçebilirsiniz.",
      "Araç teslim noktası Aliağa ofisimiz veya talep üzerine İzmir Adnan Menderes Havalimanı olabilir. Havalimanı teslimi ve karşılama isteğinizi rezervasyon sırasında belirtin; farklı noktada iade seçeneklerini ekibimizle netleştirin.",
      "Kurumsal ve uzun dönem filo ihtiyacınız için bizimle iletişime geçebilirsiniz. Kiralama koşulları, kilometre ve yakıt politikası sözleşmede açıklanır; rezervasyon öncesinde araç detaylarını ve uygunluk durumunu kontrol edin.",
    ],
  },
  en: {
    heading: "Our Vehicles",
    intro: "Daily and monthly car rental in Aliağa, with airport delivery and meet-and-greet available on request at İzmir Adnan Menderes Airport.",
    aboutTitle: "Renting a Car with Rentwin",
    aboutParagraphs: [
      "Rentwin's Aliağa and İzmir fleet includes hatchbacks, sedans, SUVs, and commercial vehicles. Filter by make, transmission, and fuel type to choose a car for a daily or monthly rental.",
      "Pick-up can be arranged at our Aliağa office or, on request, at İzmir Adnan Menderes Airport. Mention airport delivery and meet-and-greet when booking; confirm any different return location with our team.",
      "Contact us about corporate and long-term fleet needs. Rental terms, mileage, and fuel policies are explained in the contract; check vehicle details and availability before booking.",
    ],
  },
};

const VEHICLES_SEE_ALSO = Object.fromEntries(
  ["tr", "en"].map((locale) => {
    const nav = require(`../../../src/i18n/locales/${locale}/common.json`).nav;
    const lead = require(`../../../src/i18n/locales/${locale}/vehicles.json`).seoBody.seeAlso;
    return [locale, { lead, commercial: nav.commercialRental, longTerm: nav.longTermRental }];
  })
);

// vehicles: [{ id, brand, model }]
const renderVehiclesListBody = (vehicles = [], locale = "tr") => {
  const copy = VEHICLES_LIST_COPY[locale];
  const links = vehicles
    .map((v) => htmlLink(`${SITE_URL}${localizePath(`/vehicles/${v.id}`, locale)}`, `${(v.brand || "").trim()} ${(v.model || "").trim()}`.trim()))
    .join("");
  return (
    `<main><h1>${htmlEsc(copy.heading)}</h1><p>${htmlEsc(copy.intro)}</p>` +
    (links ? `<ul>${links}</ul>` : "") +
    `<h2>${htmlEsc(copy.aboutTitle)}</h2>` +
    copy.aboutParagraphs.map((p) => `<p>${htmlEsc(p)}</p>`).join("") +
    // Same "see also" line as src/pages/common/vehicles/page.jsx.
    `<p>${htmlEsc(VEHICLES_SEE_ALSO[locale].lead)} ` +
    `<a href="${htmlEsc(SITE_URL + localizePath("/ticari-arac-kiralama", locale))}">${htmlEsc(VEHICLES_SEE_ALSO[locale].commercial)}</a> · ` +
    `<a href="${htmlEsc(SITE_URL + localizePath("/uzun-donem-arac-kiralama", locale))}">${htmlEsc(VEHICLES_SEE_ALSO[locale].longTerm)}</a></p>` +
    "</main>"
  );
};

const LOCATIONS_LIST_COPY = {
  tr: {
    heading: "Lokasyonlarımız",
    intro: "Rentwin olarak aşağıdaki lokasyonlarda araç kiralama hizmeti veriyoruz. Bölgenizi seçin, o noktadan teslim alabileceğiniz araçları ve şartları görün.",
  },
  en: {
    heading: "Our Locations",
    intro: "Rentwin offers car rental at the locations below. Choose your area to see the vehicles you can pick up there and the terms that apply.",
  },
};

// locations: [{ name }]
const renderLocationsListBody = (locations = [], locale = "tr") => {
  const links = locations
    .map((l) => htmlLink(`${SITE_URL}${localizePath(`/lokasyonlar/${slugify(l.name)}`, locale)}`, l.name))
    .join("");
  const copy = LOCATIONS_LIST_COPY[locale];
  return `<main><h1>${htmlEsc(copy.heading)}</h1><p>${htmlEsc(copy.intro)}</p>${links ? `<ul>${links}</ul>` : ""}</main>`;
};

const BLOG_LIST_COPY = {
  tr: {
    heading: "Blog",
    intro: "Araç kiralama rehberleri, seyahat önerileri ve Rentwin'den güncel bilgiler. Aliağa ve İzmir'de araç kiralarken bilmeniz gerekenler.",
  },
  en: {
    heading: "Blog",
    intro: "Car rental guides, travel tips and the latest news from Rentwin. What to know when renting a car in Aliağa and İzmir.",
  },
};

// posts: [{ slug, title }]
// Posts are Turkish-only, so every link (on /blog and /en/blog alike) points
// at the TR canonical URL — see buildHead's blog post branch.
const renderBlogListBody = (posts = [], locale = "tr") => {
  const links = posts.map((p) => htmlLink(`${SITE_URL}/blog/${p.slug}`, p.title)).join("");
  const copy = BLOG_LIST_COPY[locale];
  return `<main><h1>${htmlEsc(copy.heading)}</h1><p>${htmlEsc(copy.intro)}</p>${links ? `<ul>${links}</ul>` : ""}</main>`;
};

/* ---------------------------------------------- /sss crawler body  */
// Reuses FAQ_ITEMS below rather than a separate copy — it's already the
// exact Q&A content this page shows (and what faqLd() turns into FAQPage
// JSON-LD), so there's nothing to duplicate a second time.
const FAQ_INTRO = {
  tr: "Araç kiralama sürecine dair en çok sorulan soruların yanıtlarını burada topladık. Aradığınızı bulamazsanız İletişim sayfasından bize ulaşabilirsiniz.",
  en: "We've gathered the answers to the questions we hear most about renting a car. If you can't find what you're looking for, reach us from the Contact page.",
};
const renderFaqBody = (locale = "tr") =>
  `<main><h1>${htmlEsc(locale === "en" ? "Frequently Asked Questions" : "Sıkça Sorulan Sorular")}</h1>` +
  `<p>${htmlEsc(FAQ_INTRO[locale])}</p>` +
  FAQ_ITEMS[locale].map((item) => `<h2>${htmlEsc(item.q)}</h2><p>${htmlEsc(item.a)}</p>`).join("") +
  "</main>";

/* -------------------------------------------- /about crawler body  */
// Mirrors src/pages/common/about/page.jsx + locales/{tr,en}/about.json `whoWeAre`.
const ABOUT_COPY = {
  tr: {
    heading: "Güvenli, Şeffaf ve Yenilikçi Araç Kiralama Deneyimi",
    desc: [
      "Rentwin, araç kiralama ve filo yönetimi süreçlerini karmaşadan uzaklaştırarak hem bireysel hem de kurumsal müşterilerimize hızlı, güvenilir ve dijital çözümler sunmak amacıyla yola çıktı.",
      "Sektördeki operasyonel tecrübemizi modern yazılım teknolojileriyle birleştirerek; rezervasyondan araç teslimine, faturalandırmadan teknik desteğe kadar tüm süreçleri zahmetsiz hale getiriyoruz. Geniş araç filomuz, bakımlı araç garantimiz ve müşteri odaklı hizmet anlayışımızla yolculuğunuzun her anında yanınızdayız.",
    ],
    mission: { title: "Misyonumuz", text: "Araç kiralamayı şeffaf, hızlı ve öngörülebilir bir deneyime dönüştürmek; her müşterimize bakımlı araç ve zamanında hizmet güvencesi vermek." },
    vision: { title: "Vizyonumuz", text: "Türkiye'nin dijital altyapısı en güçlü, müşteri memnuniyeti en yüksek araç kiralama ve filo yönetimi markası olmak." },
  },
  en: {
    heading: "A Safe, Transparent and Modern Car Rental Experience",
    desc: [
      "Rentwin set out to take the friction out of car rental and fleet management, giving both individual and corporate customers fast, reliable and fully digital solutions.",
      "By pairing hands-on operational experience with modern software, we make every step effortless — from reservation to hand-over, from invoicing to technical support. With a wide fleet, a well-maintained-vehicle guarantee and a customer-first approach, we are with you at every point of the journey.",
    ],
    mission: { title: "Our Mission", text: "To turn car rental into a transparent, fast and predictable experience, and to give every customer a well-maintained vehicle and on-time service." },
    vision: { title: "Our Vision", text: "To be the car rental and fleet-management brand with the strongest digital backbone and the highest customer satisfaction in Türkiye." },
  },
};
const renderAboutBody = (locale = "tr") => {
  const c = ABOUT_COPY[locale];
  return (
    `<main><h1>${htmlEsc(c.heading)}</h1>` +
    c.desc.map((p) => `<p>${htmlEsc(p)}</p>`).join("") +
    `<h2>${htmlEsc(c.mission.title)}</h2><p>${htmlEsc(c.mission.text)}</p>` +
    `<h2>${htmlEsc(c.vision.title)}</h2><p>${htmlEsc(c.vision.text)}</p>` +
    "</main>"
  );
};

const renderHomeBody = (locale = "tr") => {
  const c = HOME_COPY[locale];
  return (
    `<main><h1>${htmlEsc(c.hero.title)}</h1>` +
    `<p>${htmlEsc(c.hero.lead)}</p>` +
    `<ul>${c.hero.trust.map((item) => `<li>${htmlEsc(item)}</li>`).join("")}</ul>` +
    `<h2>${htmlEsc(c.sections.popularCars.title1)} ${htmlEsc(c.sections.popularCars.title2)}</h2>` +
    `<p>${htmlEsc(c.sections.popularCars.desc)}</p>` +
    `<h2>${htmlEsc(c.whatWeDo.title)}</h2><p>${htmlEsc(c.whatWeDo.desc)}</p>` +
    `<ul>${c.whatWeDo.services.map((service) => `<li>${htmlEsc(service.title)}</li>`).join("")}</ul>` +
    `<p><a href="${htmlEsc(localizePath("/vehicles", locale))}">${htmlEsc(c.hero.browseCta)}</a></p>` +
    "</main>"
  );
};

const renderPrivacyPolicyBody = (locale = "tr") => {
  const copy = PRIVACY_POLICY_COPY[locale];
  const sections = copy.sections
    .map(
      (section) =>
        `<section><h2>${htmlEsc(section.heading)}</h2>` +
        (section.paragraphs || []).map((paragraph) => `<p>${htmlEsc(paragraph)}</p>`).join("") +
        (section.list
          ? `<ul>${section.list.map((item) => `<li>${htmlEsc(item)}</li>`).join("")}</ul>`
          : "") +
        "</section>"
    )
    .join("");
  return (
    `<main><h1>${htmlEsc(copy.title)}</h1>` +
    `<p>${htmlEsc(copy.intro)}</p><p>${htmlEsc(copy.updated)}</p>` +
    sections +
    "</main>"
  );
};

/* ------------------------------------------ /contact crawler body  */
// Mirrors src/pages/common/contact/page.jsx + locales/{tr,en}/contact.json —
// the form itself isn't content, only the intro + the real NAP details
// (already real values, same as business.* above) are worth rendering here.
const CONTACT_COPY = {
  tr: { desc: "Rentwin'de, size yardımcı olmak için her zaman hazırız. Müşteri hizmetleri ekibimiz sorularınız, rezervasyonlarınız ve geri bildirimleriniz için 7/24 hizmetinizdedir. Aşağıdaki kanallardan bize ulaşabilir veya formu doldurarak talebinizi iletebilirsiniz.", phone: "Telefon", email: "E-posta", address: "Adres" },
  en: { desc: "At Rentwin, we're always ready to assist you. Our customer service team is available 24/7 for your questions, bookings and feedback. Reach us through any of the channels below, or send your request using the form.", phone: "Phone", email: "Email", address: "Address" },
};
const renderContactBody = (locale = "tr") => {
  const c = CONTACT_COPY[locale];
  const addr = `${business.streetAddress}, ${business.addressLocality} / ${business.addressRegion}`;
  return (
    `<main><h1>${htmlEsc(locale === "en" ? "Contact Us" : "İletişim")}</h1><p>${htmlEsc(c.desc)}</p>` +
    "<ul>" +
    `<li>${htmlEsc(c.phone)}: ${htmlEsc(business.phoneE164)}</li>` +
    `<li>${htmlEsc(c.email)}: ${htmlEsc(business.email)}</li>` +
    `<li>${htmlEsc(c.address)}: ${htmlEsc(addr)}</li>` +
    "</ul></main>"
  );
};

/* ------------------------------------------ /yorumlar crawler body  */
// Mirrors src/pages/common/reviews/page.jsx + locales/{tr,en}/reviews.json
// (pageTitle/intro/summary/empty — form isn't content, not duplicated here).
// reviewSummary/reviews come from the same loadReviewSeoData() query the
// JSON-LD below it uses, so the two never drift.
const REVIEWS_COPY = {
  tr: {
    pageTitle: "Müşteri Yorumları",
    intro: "Rentwin müşterilerinin gerçek yorumları ve puanları. Siz de deneyiminizi paylaşabilirsiniz.",
    summary: (count, average) => `${count} yorum, ortalama ${average} yıldız`,
    empty: "Henüz yayınlanmış bir yorum bulunmuyor.",
  },
  en: {
    pageTitle: "Customer Reviews",
    intro: "Real reviews and ratings from Rentwin customers. You can share your own experience too.",
    summary: (count, average) => `${count} reviews, ${average} average rating`,
    empty: "No reviews have been published yet.",
  },
};
const renderReviewsBody = (reviewSummary, reviews = [], locale = "tr") => {
  const c = REVIEWS_COPY[locale];
  const dateLocale = locale === "en" ? "en-GB" : "tr-TR";
  const items = reviews
    .map((r) => {
      const stars = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
      const dateStr = new Date(r.createdAt).toLocaleDateString(dateLocale);
      return (
        `<li><strong>${htmlEsc(stars)}</strong> — ${htmlEsc(dateStr)}` +
        `<p>${htmlEsc(r.body)}</p>` +
        `<span>${htmlEsc(r.name)}</span></li>`
      );
    })
    .join("");
  return (
    `<main><h1>${htmlEsc(c.pageTitle)}</h1>` +
    `<p>${htmlEsc(c.intro)}</p>` +
    (reviewSummary ? `<p>${htmlEsc(c.summary(reviewSummary.count, reviewSummary.average))}</p>` : "") +
    (items ? `<ul>${items}</ul>` : `<p>${htmlEsc(c.empty)}</p>`) +
    "</main>"
  );
};

/* ------------------------------------------- service landing pages  */
// /ticari-arac-kiralama and /uzun-donem-arac-kiralama (+ /en twins). Which
// fleet models each page lists — KEEP IN SYNC with
// src/pages/common/landing/page.jsx VARIANTS.
// Each page lists one entry per model (groupFleetByModel), cheapest first.
const COMMERCIAL_BODY_TYPES = ["PANELVAN_MINIBUS", "KAMYONET"];
const priceOrLast = (value) => (Number(value) > 0 ? Number(value) : Infinity);
const byPrice = (field) => (a, b) =>
  priceOrLast(a[field]) - priceOrLast(b[field]) ||
  `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`, "tr");
const LANDING_PAGES = {
  "/ticari-arac-kiralama": {
    key: "commercial",
    monthly: false,
    relatedPath: "/uzun-donem-arac-kiralama",
    select: (models) =>
      models.filter((m) => m.bodyTypes.some((t) => COMMERCIAL_BODY_TYPES.includes(t))).sort(byPrice("dailyPrice")),
  },
  "/uzun-donem-arac-kiralama": {
    key: "longTerm",
    monthly: true,
    relatedPath: "/ticari-arac-kiralama",
    select: (models) => models.filter((m) => Number(m.monthlyPrice) > 0).sort(byPrice("monthlyPrice")),
  },
};

const formatTry = (value) => Number(value).toLocaleString("tr-TR");
// "+905073503135" → "0507 350 31 35" (the site's own display format).
const displayPhone = (e164) => {
  const n = `0${String(e164).replace(/^\+90/, "")}`;
  return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7, 9)} ${n.slice(9)}`;
};
const landingPrice = (page, v) => Number(page.monthly ? v.monthlyPrice : v.dailyPrice);
const landingVehicleName = (v) => `${(v.brand || "").trim()} ${(v.model || "").trim()}`.replace(/\s+/g, " ").trim();

// vehicles: the page's models [{ id, brand, model, dailyPrice, monthlyPrice }]
const renderLandingBody = ({ page, canonicalPath, vehicles }, locale = "tr") => {
  const copy = LANDING_COPY[locale][page.key];
  const shared = LANDING_COPY[locale].shared;
  const card = CARD_COPY[locale];
  const prices = vehicles.map((v) => landingPrice(page, v)).filter((p) => p > 0);
  const from = prices.length
    ? shared[page.monthly ? "fromMonthly" : "fromDaily"].replace("{{price}}", formatTry(Math.min(...prices)))
    : null;
  const unit = page.monthly ? card.plusVatPerMonth : card.plusVatPerDay;
  const vehicleItems = vehicles
    .map((v) => {
      const price = landingPrice(page, v);
      const url = `${SITE_URL}${localizePath(`/vehicles/${v.id}`, locale)}`;
      return (
        `<li><a href="${htmlEsc(url)}">${htmlEsc(landingVehicleName(v))}</a>` +
        (price > 0 ? ` — ${htmlEsc(formatTry(price))} TL ${htmlEsc(unit)}` : "") +
        "</li>"
      );
    })
    .join("");
  const link = (path, label) => `<a href="${htmlEsc(SITE_URL + localizePath(path, locale))}">${htmlEsc(label)}</a>`;
  return (
    `<main><h1>${htmlEsc(copy.heading)}</h1><p>${htmlEsc(copy.lead)}</p>` +
    (from ? `<p>${htmlEsc(from)}</p>` : "") +
    `<section><h2>${htmlEsc(copy.fleetTitle)}</h2><p>${htmlEsc(copy.fleetIntro)}</p>` +
    (vehicleItems ? `<ul>${vehicleItems}</ul>` : `<p>${htmlEsc(shared.fleetEmpty)}</p>`) +
    "</section>" +
    `<section><h2>${htmlEsc(copy.typesTitle)}</h2>` +
    copy.types.map((t) => `<h3>${htmlEsc(t.title)}</h3><p>${htmlEsc(t.text)}</p>`).join("") +
    "</section>" +
    `<section><h2>${htmlEsc(copy.whyTitle)}</h2><ul>${copy.why.map((w) => `<li>${htmlEsc(w)}</li>`).join("")}</ul></section>` +
    `<section><h2>${htmlEsc(copy.howTitle)}</h2><ol>${copy.how.map((h) => `<li>${htmlEsc(h)}</li>`).join("")}</ol></section>` +
    `<section><h2>${htmlEsc(copy.faqTitle)}</h2>` +
    copy.faq.map((item) => `<h3>${htmlEsc(item.q)}</h3><p>${htmlEsc(item.a)}</p>`).join("") +
    `<p>${htmlEsc(shared.faqMore)} ${link("/sss", shared.faqMoreLink)}${htmlEsc(shared.faqMoreSuffix)}</p></section>` +
    `<section><h2>${htmlEsc(copy.ctaTitle)}</h2><p>${htmlEsc(copy.ctaText)}</p>` +
    `<p><a href="tel:${htmlEsc(business.phoneE164)}">${htmlEsc(shared.call.replace("{{phone}}", displayPhone(business.phoneE164)))}</a>` +
    ` · ${link("/contact", shared.contactForm)}</p></section>` +
    `<p>${htmlEsc(copy.relatedLead)} ${link(page.relatedPath, copy.relatedLabel)}</p>` +
    "</main>"
  );
};

const buildLandingHead = ({ head, page, canonicalPath, fleet, locale }) => {
  const copy = LANDING_COPY[locale][page.key];
  const vehicles = page.select(groupFleetByModel(fleet || []));
  const jsonLd = [
    breadcrumbLd([{ name: NAV[locale].home, path: "/" }, { name: copy.pageTitle }], locale),
    serviceLd({
      name: copy.heading,
      serviceType: copy.serviceType,
      description: copy.seoDescription,
      path: canonicalPath,
      locale,
    }),
    faqLd(copy.faq),
  ];
  if (vehicles.length) {
    jsonLd.push(
      itemListLd({
        name: copy.fleetTitle,
        itemListElement: vehicles.map((v, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: landingVehicleName(v),
          url: `${SITE_URL}${localizePath(`/vehicles/${v.id}`, locale)}`,
        })),
      })
    );
  }
  return {
    ...head,
    title: copy.seoTitle,
    description: copy.seoDescription,
    jsonLd,
    bodyHtml: renderLandingBody({ page, canonicalPath, vehicles }, locale),
  };
};

// path → { title, description, jsonLd(locale) } per locale. Keyed by the
// canonical (unprefixed/TR-shaped) path in both maps.
const STATIC_META = {
  tr: {
    "/": {
      title: "Aliağa Araç Kiralama | Rentwin — Aliağa ve İzmir",
      description:
        "Aliağa'da günlük ve aylık araç kiralama. İzmir Adnan Menderes Havalimanı'nda teslim ve karşılama; bakımlı filoyu inceleyip online rezervasyon yapın.",
      jsonLd: (locale) => [webSiteLd(locale)],
    },
    "/vehicles": {
      title: "Aliağa ve İzmir Araç Kiralama | Rentwin",
      description:
        "Aliağa'da günlük ve aylık araç kiralama. İzmir Adnan Menderes Havalimanı'nda teslim ve karşılama talep edin; araçları inceleyip online rezervasyon yapın.",
      jsonLd: (locale) => [breadcrumbLd([{ name: NAV.tr.home, path: "/" }, { name: "Araçlarımız" }], locale)],
    },
    "/lokasyonlar": {
      title: "Araç Kiralama Lokasyonları | Rentwin",
      description:
        "Rentwin'in araç kiralama hizmeti verdiği tüm lokasyonlar. Bulunduğunuz bölgeyi seçin, uygun fiyatlı ve bakımlı kiralık araçları keşfedin.",
      jsonLd: (locale) => [breadcrumbLd([{ name: NAV.tr.home, path: "/" }, { name: "Lokasyonlarımız" }], locale)],
    },
    "/kampanyalar": {
      title: "Kampanyalar ve Fırsatlar | Rentwin Araç Kiralama",
      description:
        "Rentwin'in güncel araç kiralama kampanyaları ve indirim fırsatları. Hafta sonu, uzun dönem ve sezon fırsatlarını kaçırmayın, avantajlı fiyatlarla kiralayın.",
      jsonLd: (locale) => [breadcrumbLd([{ name: NAV.tr.home, path: "/" }, { name: "Kampanyalar" }], locale)],
    },
    "/blog": {
      title: "Blog | Rentwin Araç Kiralama",
      description:
        "Araç kiralama rehberleri, seyahat önerileri ve Rentwin'den güncel bilgiler. Aliağa ve İzmir'de araç kiralarken bilmeniz gerekenler.",
      jsonLd: (locale) => [breadcrumbLd([{ name: NAV.tr.home, path: "/" }, { name: "Blog" }], locale)],
    },
    "/yorumlar": {
      title: "Müşteri Yorumları | Rentwin Araç Kiralama",
      description:
        "Rentwin müşterilerinin gerçek yorumları ve puanları. Deneyiminizi paylaşın, diğer müşterilerin yorumlarını inceleyin.",
      jsonLd: (locale) => [breadcrumbLd([{ name: NAV.tr.home, path: "/" }, { name: "Yorumlar" }], locale)],
    },
    "/about": {
      title: "Hakkımızda | Rentwin Araç Kiralama",
      description:
        "Rentwin'i tanıyın: bireysel ve kurumsal müşterilere hızlı, şeffaf ve dijital araç kiralama ile filo yönetimi çözümleri sunuyoruz.",
      jsonLd: (locale) => [breadcrumbLd([{ name: NAV.tr.home, path: "/" }, { name: "Hakkımızda" }], locale)],
    },
    "/contact": {
      title: "İletişim | Rentwin Araç Kiralama",
      description:
        "Rentwin müşteri hizmetleri ekibine ulaşın. Rezervasyon, sorularınız ve geri bildirimleriniz için bize her zaman yazabilirsiniz.",
      jsonLd: (locale) => [breadcrumbLd([{ name: NAV.tr.home, path: "/" }, { name: "İletişim" }], locale)],
    },
    "/sss": {
      title: "Sıkça Sorulan Sorular | Rentwin Araç Kiralama",
      description:
        "Rentwin araç kiralama hakkında merak edilenler: kiralama yaşı, gerekli belgeler, depozito, kilometre limiti, yakıt politikası, HGS geçişleri ve daha fazlası.",
      jsonLd: (locale) => [
        breadcrumbLd([{ name: NAV.tr.home, path: "/" }, { name: "Sıkça Sorulan Sorular" }], locale),
        faqLd(FAQ_ITEMS.tr),
      ],
    },
    "/privacy-policy": {
      title: "Gizlilik ve Kişisel Verilerin Korunması Politikası",
      description:
        "Rentwin markası altında sunulan araç kiralama ve rezervasyon hizmetlerinde kişisel verilerinizin KVKK kapsamında nasıl işlendiğine dair aydınlatma metni.",
      jsonLd: () => [],
    },
  },
  en: {
    "/blog": {
      title: "Blog | Rentwin Car Rental",
      description:
        "Car rental guides, travel tips and the latest news from Rentwin. What to know when renting a car in Aliağa and İzmir.",
      jsonLd: (locale) => [breadcrumbLd([{ name: NAV.en.home, path: "/" }, { name: "Blog" }], locale)],
    },
    "/yorumlar": {
      title: "Customer Reviews | Rentwin Car Rental",
      description:
        "Real reviews and ratings from Rentwin customers. Share your experience and read what others are saying.",
      jsonLd: (locale) => [breadcrumbLd([{ name: NAV.en.home, path: "/" }, { name: "Reviews" }], locale)],
    },
    "/": {
      title: "Car Rental in Aliağa | Rentwin — Aliağa & İzmir",
      description:
        "Daily and monthly car rental in Aliağa. Request vehicle delivery and meet-and-greet at İzmir Adnan Menderes Airport, and book online.",
      jsonLd: (locale) => [webSiteLd(locale)],
    },
    "/vehicles": {
      title: "Car Rental in Aliağa & İzmir | Rentwin",
      description:
        "Daily and monthly car rental in Aliağa. Request delivery and meet-and-greet at İzmir Adnan Menderes Airport, then book online.",
      jsonLd: (locale) => [breadcrumbLd([{ name: NAV.en.home, path: "/" }, { name: "Our Vehicles" }], locale)],
    },
    "/lokasyonlar": {
      title: "Car Rental Locations | Rentwin",
      description:
        "Every location Rentwin serves. Pick your area and discover well-kept rental cars at fair prices.",
      jsonLd: (locale) => [breadcrumbLd([{ name: NAV.en.home, path: "/" }, { name: "Our Locations" }], locale)],
    },
    "/kampanyalar": {
      title: "Campaigns & Deals | Rentwin Car Rental",
      description:
        "Rentwin's latest car rental campaigns and discount deals. Don't miss weekend, long-term and seasonal offers — rent at advantageous prices.",
      jsonLd: (locale) => [breadcrumbLd([{ name: NAV.en.home, path: "/" }, { name: "Campaigns" }], locale)],
    },
    "/about": {
      title: "About Us | Rentwin Car Rental",
      description:
        "Get to know Rentwin: fast, transparent and fully digital car rental and fleet-management solutions for individuals and businesses.",
      jsonLd: (locale) => [breadcrumbLd([{ name: NAV.en.home, path: "/" }, { name: "About Us" }], locale)],
    },
    "/contact": {
      title: "Contact Us | Rentwin Car Rental",
      description:
        "Reach the Rentwin customer service team for bookings, questions, and feedback. We're always happy to help.",
      jsonLd: (locale) => [breadcrumbLd([{ name: NAV.en.home, path: "/" }, { name: "Contact Us" }], locale)],
    },
    "/sss": {
      title: "Frequently Asked Questions | Rentwin Car Rental",
      description:
        "Everything you need to know about renting with Rentwin: minimum age, required documents, deposit, mileage limit, fuel policy, toll charges and more.",
      jsonLd: (locale) => [
        breadcrumbLd([{ name: NAV.en.home, path: "/" }, { name: "Frequently Asked Questions" }], locale),
        faqLd(FAQ_ITEMS.en),
      ],
    },
    "/privacy-policy": {
      title: "Privacy & Personal Data Protection Policy",
      description:
        "How your personal data is processed under Turkey's KVKK law across the car rental and reservation services offered under the Rentwin brand.",
      jsonLd: () => [],
    },
  },
};

const ITEM_LIST_NAMES = {
  vehicles: { tr: "Kiralık Araçlar", en: "Rental Cars" },
  locations: { tr: "Araç Kiralama Lokasyonları", en: "Car Rental Locations" },
  campaigns: { tr: "Kampanyalar", en: "Campaigns" },
  blog: { tr: "Blog Yazıları", en: "Blog Posts" },
};

/* --------------------------------------------------------------- buildHead  */

const base = (path) => {
  const locale = localeFromPath(path);
  return {
    path,
    url: `${SITE_URL}${path}`,
    title: STATIC_META[locale]["/"].title,
    description: STATIC_META[locale]["/"].description,
    canonical: `${SITE_URL}${path}`,
    ogImage: DEFAULT_IMAGE,
    ogImageDefault: true, // the branded 1200x630 card — emit its dimensions
    ogType: "website",
    robots: "index, follow",
    ogLocale: locale === "en" ? "en_US" : "tr_TR",
    ogLocaleAlt: locale === "en" ? "tr_TR" : "en_US",
    htmlLang: locale,
    jsonLd: [],
  };
};

const noindex = (head) => ({ ...head, canonical: null, robots: "noindex, nofollow" });

/**
 * @param {object} args
 * @param {string} args.path      normalized request path, no trailing slash ("/" or "/en" stay as-is) — may carry an "/en" locale prefix
 * @param {object} [args.vehicle] { id, name, brand, model, image, transmission, fuelType, modelYear, color } or null
 * @param {boolean} [args.vehicleMissing]  path was /vehicles/:id but no such vehicle
 * @param {object[]} [args.related]        [{ id, name }] a few other in-service vehicles, for the vehicle detail body
 * @param {string} [args.canonicalVehicleId]  another vehicle's id to canonicalize to instead of self — set when another active unit of the same model is that model's canonical page (see vehicles.shared.loadModelContext)
 * @param {string} [args.locationName]     resolved Location.name for /lokasyonlar/:slug
 * @param {string} [args.slug]             the raw /lokasyonlar/:slug param (keys LOCATION_LOCAL_COPY)
 * @param {boolean} [args.locationMissing] path was /lokasyonlar/:slug but no match
 * @param {object} [args.post]      { title, excerpt, content, image, publishedAt, updatedAt } for /blog/:slug
 * @param {boolean} [args.postMissing]  path was /blog/:slug but no such (published) post
 * @param {object[]} [args.vehicles]        [{ id, brand, model }] for the /vehicles list
 * @param {object[]} [args.locations]       [{ name }] for the /lokasyonlar list
 * @param {object[]} [args.campaigns]       [{ title, description, image, ctaLabel, ctaUrl, startsAt, endsAt }]
 * @param {object[]} [args.posts]           [{ slug, title }] for the /blog list
 * @param {object} [args.reviewSummary]     { count, average } | null — for "/" and "/yorumlar"
 * @param {object[]} [args.reviews]         latest approved reviews (name-masked) — for "/" and "/yorumlar"
 * @param {object[]} [args.fleet]           every active unit [{ id, brand, model, bodyType, dailyPrice, monthlyPrice, createdAt }] — for the LANDING_PAGES
 * @returns {{title,description,canonical,ogImage,ogType,ogLocale,ogLocaleAlt,htmlLang,robots,jsonLd:object[],bodyHtml?:string}}
 */
const buildHead = ({
  path,
  vehicle,
  vehicleMissing,
  related,
  canonicalVehicleId,
  locationName,
  slug,
  locationMissing,
  post,
  postMissing,
  vehicles,
  locations,
  campaigns,
  posts,
  reviewSummary,
  reviews,
  fleet,
}) => {
  const locale = localeFromPath(path);
  const canonicalPath = stripLocalePrefix(path);
  const nav = NAV[locale];

  // vehicle detail
  if (/^\/vehicles\/[^/]+$/.test(canonicalPath)) {
    if (vehicleMissing || !vehicle) {
      return noindex({
        ...base(path),
        title: locale === "en" ? "Vehicle Details | Rentwin Car Rental" : "Araç Detayı | Rentwin Araç Kiralama",
      });
    }
    const name = vehicle.name;
    // A sibling vehicle shares this exact templated title/description (same
    // brand/model/year/transmission/fuel) — point canonical at it instead of
    // self so the two don't compete as duplicate content (robots stays
    // index,follow: this is Google's own recommended consolidation signal,
    // not a reason to noindex).
    const canonical = canonicalVehicleId
      ? `${SITE_URL}${localizePath(`/vehicles/${canonicalVehicleId}`, locale)}`
      : `${SITE_URL}${localizePath(canonicalPath, locale)}`;
    return {
      ...base(path),
      canonical,
      title:
        locale === "en" ? `Rent a ${name} | Rentwin` : `${name} Kiralama | Rentwin`,
      description:
        locale === "en"
          ? `Rent the ${name} with Rentwin. Great rates, smooth handover, and dependable service — book your reservation now.`
          : `${name} aracını Rentwin güvencesiyle kiralayın. Uygun fiyat, sorunsuz teslimat ve güvenilir hizmet için hemen rezervasyon yapın.`,
      ogImage: vehicle.image || DEFAULT_IMAGE,
      ogImageDefault: !vehicle.image,
      ogType: "product",
      jsonLd: [
        breadcrumbLd(
          [{ name: nav.home, path: "/" }, { name: nav.vehicles, path: "/vehicles" }, { name }],
          locale
        ),
        vehicleLd({ ...vehicle, path: canonicalPath, locale }),
      ],
      bodyHtml: renderVehicleDetailBody({ vehicle, related: related || [] }, locale),
    };
  }

  // location detail
  if (/^\/lokasyonlar\/[^/]+$/.test(canonicalPath)) {
    if (locationMissing || !locationName) {
      return noindex({
        ...base(path),
        title: locale === "en" ? "Car Rental Locations | Rentwin" : "Araç Kiralama Lokasyonları | Rentwin",
      });
    }
    const override = LOCATION_META_OVERRIDES[locale][slug];
    return {
      ...base(path),
      title:
        override?.title ||
        (locale === "en"
          ? `${locationName} Car Rental | Rentwin`
          : `${locationName} Araç Kiralama | Rentwin`),
      description:
        override?.description ||
        (locale === "en"
          ? `Affordable, well-maintained rental cars in ${locationName}. Book online with Rentwin and pick up your car at ${locationName}.`
          : `${locationName} bölgesinde uygun fiyatlı ve bakımlı kiralık araçlar. Rentwin güvencesiyle online rezervasyon yapın, aracınızı ${locationName} noktasından teslim alın.`),
      jsonLd: [
        breadcrumbLd(
          [
            { name: nav.home, path: "/" },
            { name: locale === "en" ? "Our Locations" : "Lokasyonlarımız", path: "/lokasyonlar" },
            { name: locationName },
          ],
          locale
        ),
        ...(LOCATION_LOCAL_COPY[locale][slug]?.faq ? [faqLd(LOCATION_LOCAL_COPY[locale][slug].faq)] : []),
      ],
      bodyHtml: renderLocationDetailBody({ locationName, slug }, locale),
    };
  }

  // blog post detail
  if (/^\/blog\/[^/]+$/.test(canonicalPath)) {
    if (postMissing || !post) {
      return noindex({
        ...base(path),
        title: locale === "en" ? "Blog Post | Rentwin" : "Blog Yazısı | Rentwin Araç Kiralama",
      });
    }
    // BlogPost has no translation fields — every post exists in Turkish only,
    // so /en/blog/:slug serves the same Turkish text under the English UI.
    // Declaring that URL as an indexable English page made it a duplicate of
    // the TR one. Both URLs now canonicalize to the TR page, are tagged
    // lang="tr", and carry no hreflang pair (there is no English version).
    return {
      ...base(path),
      canonical: `${SITE_URL}${canonicalPath}`,
      htmlLang: "tr",
      ogLocale: "tr_TR",
      ogLocaleAlt: null,
      monolingual: true,
      title: `${post.title} | Rentwin Blog`,
      description: post.excerpt,
      ogImage: post.image || DEFAULT_IMAGE,
      ogImageDefault: !post.image,
      ogType: "article",
      jsonLd: [
        breadcrumbLd(
          [
            { name: nav.home, path: "/" },
            { name: "Blog", path: "/blog" },
            { name: post.title },
          ],
          locale
        ),
        articleLd({ ...post, path: canonicalPath }),
      ],
      bodyHtml: renderBlogPostBody({ post }, locale),
    };
  }

  // service landing pages (/ticari-arac-kiralama, /uzun-donem-arac-kiralama)
  const landing = LANDING_PAGES[canonicalPath];
  if (landing) return buildLandingHead({ head: base(path), page: landing, canonicalPath, fleet, locale });

  // static routes
  const meta = STATIC_META[locale][canonicalPath];
  if (meta) {
    const head = {
      ...base(path),
      title: meta.title,
      description: meta.description,
      jsonLd: meta.jsonLd(locale),
    };

    if (canonicalPath === "/vehicles") {
      if (vehicles && vehicles.length) {
        head.jsonLd.push(
          itemListLd({
            name: ITEM_LIST_NAMES.vehicles[locale],
            itemListElement: vehicles.slice(0, 100).map((v, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: `${(v.brand || "").trim()} ${(v.model || "").trim()}`.trim(),
              url: `${SITE_URL}${localizePath(`/vehicles/${v.id}`, locale)}`,
            })),
          })
        );
      }
      head.bodyHtml = renderVehiclesListBody(vehicles || [], locale);
    }

    if (canonicalPath === "/lokasyonlar") {
      if (locations && locations.length) {
        head.jsonLd.push(
          itemListLd({
            name: ITEM_LIST_NAMES.locations[locale],
            itemListElement: locations.map((l, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: l.name,
              url: `${SITE_URL}${localizePath(`/lokasyonlar/${slugify(l.name)}`, locale)}`,
            })),
          })
        );
      }
      head.bodyHtml = renderLocationsListBody(locations || [], locale);
    }

    if (canonicalPath === "/kampanyalar") {
      const list = campaigns || [];
      if (list.length) {
        head.jsonLd.push(
          itemListLd({
            name: ITEM_LIST_NAMES.campaigns[locale],
            itemListElement: list.map((c, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: c.title,
            })),
          })
        );
      }
      head.bodyHtml = renderCampaignsBody(list, locale);
    }

    if (canonicalPath === "/blog") {
      if (posts && posts.length) {
        head.jsonLd.push(
          itemListLd({
            name: ITEM_LIST_NAMES.blog[locale],
            itemListElement: posts.map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: p.title,
              url: `${SITE_URL}/blog/${p.slug}`, // TR canonical — posts are Turkish-only
            })),
          })
        );
      }
      head.bodyHtml = renderBlogListBody(posts || [], locale);
    }

    if (canonicalPath === "/" || canonicalPath === "/yorumlar") {
      head.jsonLd.push(autoRentalLd({ reviewSummary, reviews }));
    }
    // "/" keeps its static hero snapshot (index.html) — only /yorumlar needs
    // its #root filled in here (it has no such snapshot of its own).
    if (canonicalPath === "/yorumlar") head.bodyHtml = renderReviewsBody(reviewSummary, reviews, locale);

    if (canonicalPath === "/sss") head.bodyHtml = renderFaqBody(locale);
    if (canonicalPath === "/about") head.bodyHtml = renderAboutBody(locale);
    if (canonicalPath === "/contact") head.bodyHtml = renderContactBody(locale);
    if (canonicalPath === "/privacy-policy") head.bodyHtml = renderPrivacyPolicyBody(locale);
    if (canonicalPath === "/" && path !== "/") head.bodyHtml = renderHomeBody(locale);

    return head;
  }

  // unknown path that still matched the prerender route list — safe generic
  return base(path);
};

module.exports = {
  buildHead,
  autoRentalLd,
  webSiteLd,
  breadcrumbLd,
  faqLd,
  itemListLd,
  serviceLd,
  LANDING_PAGES,
  vehicleLd,
  articleLd,
  reviewLd,
  FAQ_ITEMS,
};
