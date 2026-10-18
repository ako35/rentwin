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
    ...(dailyPrice ? { price: dailyPrice } : {}),
    businessFunction: "https://schema.org/LeaseOut",
    seller: { "@id": ORG_ID },
  },
});

const articleLd = ({ title, excerpt, image, publishedAt, updatedAt, path, locale = "tr" }) => ({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: title,
  description: excerpt,
  ...(image ? { image } : {}),
  datePublished: new Date(publishedAt).toISOString(),
  dateModified: new Date(updatedAt || publishedAt).toISOString(),
  author: { "@id": ORG_ID },
  publisher: { "@id": ORG_ID },
  mainEntityOfPage: `${SITE_URL}${localizePath(path, locale)}`,
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
    relatedTitle: "Benzer Araçlar",
    description: ({ brand, model, transmission, fuel }) =>
      `${brand} ${model}, Rentwin filosunda ${transmission} vites ve ${fuel} yakıt seçeneğiyle hizmetinizde. Aliağa ve İzmir genelinde teslim alınabilen bu araç, bakımları tamamlanmış ve kullanıma hazır durumdadır.`,
    descriptionWithYear: ({ year, brand, model, transmission, fuel }) =>
      `${year} model ${brand} ${model}, Rentwin filosunda ${transmission} vites ve ${fuel} yakıt seçeneğiyle hizmetinizde. Aliağa ve İzmir genelinde teslim alınabilen bu araç, bakımları tamamlanmış ve kullanıma hazır durumdadır.`,
  },
  en: {
    highlightsTitle: "Property Higlights",
    modelLabel: "Model",
    transmissionLabel: "Transmission",
    fuelLabel: "Fuel Type",
    dailyPriceLabel: "Daily Price",
    monthlyPriceLabel: "Monthly Price",
    relatedTitle: "Similar Vehicles",
    description: ({ brand, model, transmission, fuel }) =>
      `The ${brand} ${model} is part of the Rentwin fleet, available with ${transmission} transmission and ${fuel} fuel. Available for pickup across Aliağa and İzmir, this vehicle is fully serviced and ready to drive.`,
    descriptionWithYear: ({ year, brand, model, transmission, fuel }) =>
      `The ${year} ${brand} ${model} is part of the Rentwin fleet, available with ${transmission} transmission and ${fuel} fuel. Available for pickup across Aliağa and İzmir, this vehicle is fully serviced and ready to drive.`,
  },
};

// vehicle: { name, brand, model, transmission, fuelType, modelYear } (raw
// enum values, labeled here); related: [{ id, name }] — a few other
// in-service vehicles to link to, same purpose as the frontend's "Benzer
// Araçlar" section (internal link discovery for a crawler that never runs
// the client-side fetch).
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
      ? `<li>${htmlEsc(copy.dailyPriceLabel)}: ${htmlEsc(`${Number(vehicle.dailyPrice).toLocaleString("tr-TR")} TL`)}</li>`
      : "") +
    (vehicle.monthlyPrice
      ? `<li>${htmlEsc(copy.monthlyPriceLabel)}: ${htmlEsc(`${Number(vehicle.monthlyPrice).toLocaleString("tr-TR")} TL`)}</li>`
      : "");

  return (
    `<main><h1>${htmlEsc(vehicle.name)}</h1>` +
    `<p>${htmlEsc(description)}</p>` +
    `<h2>${htmlEsc(copy.highlightsTitle)}</h2>` +
    "<ul>" +
    `<li>${htmlEsc(copy.modelLabel)}: ${htmlEsc(`${vehicle.brand} ${vehicle.model}`.trim())}</li>` +
    `<li>${htmlEsc(copy.transmissionLabel)}: ${htmlEsc(transmissionLabel)}</li>` +
    `<li>${htmlEsc(copy.fuelLabel)}: ${htmlEsc(fuelLabel)}</li>` +
    priceItems +
    "</ul>" +
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
      `${n} noktasından hızlı teslim alma ve bırakma`,
      "Online rezervasyon ve esnek iptal koşulları",
    ],
    howTitle: (n) => `${n} lokasyonundan kiralama nasıl işler?`,
    how: (n) => [
      `Alış–bırakış tarih ve saatlerinizi seçip ${n} için müsait araçları listeleyin.`,
      "Aracınızı ve ek hizmetleri (havalimanı karşılama, tek yön kiralama, ek sürücü) belirleyip rezervasyonu oluşturun.",
      `${n} noktasında kimlik, ehliyet ve kart ile aracınızı teslim alın; depozito talep edilmez.`,
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
      `Fast pick-up and drop-off at ${n}`,
      "Online booking with flexible cancellation",
    ],
    howTitle: (n) => `How does renting from ${n} work?`,
    how: (n) => [
      `Choose your pick-up and drop-off dates and times to list the cars available at ${n}.`,
      "Select your car and any extras (airport meet-and-greet, one-way rental, additional driver) and place the booking.",
      `Pick up your car at ${n} with your ID, licence, and card — no deposit required.`,
    ],
  },
};

// Per-slug extra paragraphs — mirrors locations.json `detail.local.*`. Only
// "aliaga" has one today; a slug with none simply gets no extra section.
const LOCATION_LOCAL_COPY = {
  tr: {
    aliaga: {
      title: "Aliağa'da araç kiralama hakkında",
      paragraphs: [
        "Aliağa; STAR Rafineri, Petkim petrokimya kompleksi ve liman tesisleriyle İzmir'in önemli sanayi merkezlerinden biri. İş seyahati, fabrika ziyaretleri veya vardiya değişimleri için araç kiralamak isteyenler Rentwin'in Atatürk Mahallesi'ndeki ofisinden dakikalar içinde araç teslim alabilir.",
        "Aliağa merkezden Foça, Yeni Foça ve Çandarlı'daki tatil beldelerine kolayca ulaşabilir, İzmir Adnan Menderes Havalimanı'na teslim ve karşılama hizmetimizden yararlanabilirsiniz. Ofisimiz haftanın 7 günü açık: Pazartesi–Cuma 09:00–21:00, Cumartesi 09:00–19:00, Pazar 09:00–17:00.",
      ],
    },
  },
  en: {
    aliaga: {
      title: "Renting a car in Aliağa",
      paragraphs: [
        "Aliağa is one of İzmir's key industrial hubs, home to the STAR Refinery, the Petkim petrochemical complex and major port facilities. If you're here for business travel, plant visits or shift changes, you can pick up a car from our office in Atatürk Mahallesi in minutes.",
        "From central Aliağa you can easily reach nearby coastal towns like Foça, Yeni Foça and Çandarlı, and we also offer airport delivery and meet-and-greet at İzmir Adnan Menderes Airport. Our office is open 7 days a week: Monday–Friday 09:00–21:00, Saturday 09:00–19:00, Sunday 09:00–17:00.",
      ],
    },
  },
};

const renderLocationDetailBody = ({ locationName, slug }, locale = "tr") => {
  const copy = LOCATIONS_COPY[locale];
  const local = LOCATION_LOCAL_COPY[locale][slug];
  const list = (items) => `<ul>${items.map((i) => `<li>${htmlEsc(i)}</li>`).join("")}</ul>`;
  const steps = (items) => `<ol>${items.map((i) => `<li>${htmlEsc(i)}</li>`).join("")}</ol>`;
  return (
    `<main><h1>${htmlEsc(copy.heading(locationName))}</h1>` +
    `<p>${htmlEsc(copy.lead(locationName))}</p>` +
    `<h2>${htmlEsc(copy.whyTitle(locationName))}</h2>${list(copy.why(locationName))}` +
    `<h2>${htmlEsc(copy.howTitle(locationName))}</h2>${steps(copy.how(locationName))}` +
    (local
      ? `<h2>${htmlEsc(local.title)}</h2>${local.paragraphs.map((p) => `<p>${htmlEsc(p)}</p>`).join("")}`
      : "") +
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
    intro: "Aliağa ve İzmir'de günlük ve uzun dönem araç kiralama — bakımlı, tam sigortalı filo ve şeffaf fiyatlandırma.",
    aboutTitle: "Rentwin ile Araç Kiralama",
    aboutParagraphs: [
      "Filomuz hatchback ve sedanlardan ferah SUV ve ticari araçlara kadar farklı ihtiyaçlara yanıt verir. Aracınızı marka, vites ve yakıt tipine göre filtreleyerek şehir içi kullanım, iş seyahati veya tatil için en uygun seçeneği hızlıca bulabilirsiniz.",
      "Araçları Aliağa ofisimizden veya İzmir Adnan Menderes Havalimanı'ndan teslim alabilir, dilerseniz farklı bir noktada bırakabilirsiniz. Havalimanı karşılama hizmetini rezervasyon sırasında belirtmeniz yeterli.",
      "Depozito talep etmiyoruz; kilometre limiti, yakıt politikası ve HGS geçişleri sözleşmede açıkça yazılıdır. Rezervasyonunuzu dakikalar içinde online oluşturabilir, alış saatine 24 saatten fazla varken ücretsiz iptal edebilirsiniz.",
    ],
  },
  en: {
    intro: "Daily and long-term car rental in Aliağa and İzmir — a well-maintained, fully insured fleet with transparent pricing.",
    aboutTitle: "Renting a Car with Rentwin",
    aboutParagraphs: [
      "Our fleet covers everything from hatchbacks and sedans to roomy SUVs and vans. Filter by brand, transmission, and fuel type to quickly find the right car for city driving, a business trip, or a holiday.",
      "Pick your car up at our Aliağa office or at İzmir Adnan Menderes Airport, and drop it off at a different location if you need to. Just request the airport meet-and-greet when you book.",
      "We ask for no deposit; the mileage limit, fuel policy, and toll (HGS) charges are all stated clearly in the contract. Book online in minutes and cancel free of charge up to 24 hours before pick-up.",
    ],
  },
};

// vehicles: [{ id, brand, model }]
const renderVehiclesListBody = (vehicles = [], locale = "tr") => {
  const copy = VEHICLES_LIST_COPY[locale];
  const links = vehicles
    .map((v) => htmlLink(`${SITE_URL}${localizePath(`/vehicles/${v.id}`, locale)}`, `${(v.brand || "").trim()} ${(v.model || "").trim()}`.trim()))
    .join("");
  return (
    `<main><p>${htmlEsc(copy.intro)}</p>` +
    (links ? `<ul>${links}</ul>` : "") +
    `<h2>${htmlEsc(copy.aboutTitle)}</h2>` +
    copy.aboutParagraphs.map((p) => `<p>${htmlEsc(p)}</p>`).join("") +
    "</main>"
  );
};

const LOCATIONS_LIST_COPY = {
  tr: { intro: "Rentwin olarak aşağıdaki lokasyonlarda araç kiralama hizmeti veriyoruz. Bölgenizi seçin, o noktadan teslim alabileceğiniz araçları ve şartları görün." },
  en: { intro: "Rentwin offers car rental at the locations below. Choose your area to see the vehicles you can pick up there and the terms that apply." },
};

// locations: [{ name }]
const renderLocationsListBody = (locations = [], locale = "tr") => {
  const links = locations
    .map((l) => htmlLink(`${SITE_URL}${localizePath(`/lokasyonlar/${slugify(l.name)}`, locale)}`, l.name))
    .join("");
  return `<main><p>${htmlEsc(LOCATIONS_LIST_COPY[locale].intro)}</p>${links ? `<ul>${links}</ul>` : ""}</main>`;
};

const BLOG_LIST_COPY = {
  tr: { intro: "Araç kiralama rehberleri, seyahat önerileri ve Rentwin'den güncel bilgiler. Aliağa ve İzmir'de araç kiralarken bilmeniz gerekenler." },
  en: { intro: "Car rental guides, travel tips and the latest news from Rentwin. What to know when renting a car in Aliağa and İzmir." },
};

// posts: [{ slug, title }]
const renderBlogListBody = (posts = [], locale = "tr") => {
  const links = posts.map((p) => htmlLink(`${SITE_URL}${localizePath(`/blog/${p.slug}`, locale)}`, p.title)).join("");
  return `<main><p>${htmlEsc(BLOG_LIST_COPY[locale].intro)}</p>${links ? `<ul>${links}</ul>` : ""}</main>`;
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
  `<main><p>${htmlEsc(FAQ_INTRO[locale])}</p>` +
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
    `<main><p>${htmlEsc(c.desc)}</p>` +
    "<ul>" +
    `<li>${htmlEsc(c.phone)}: ${htmlEsc(business.phoneE164)}</li>` +
    `<li>${htmlEsc(c.email)}: ${htmlEsc(business.email)}</li>` +
    `<li>${htmlEsc(c.address)}: ${htmlEsc(addr)}</li>` +
    "</ul></main>"
  );
};

// path → { title, description, jsonLd(locale) } per locale. Keyed by the
// canonical (unprefixed/TR-shaped) path in both maps.
const STATIC_META = {
  tr: {
    "/": {
      title: "Rentwin | Aliağa & İzmir Araç Kiralama — Şeffaf Fiyat",
      description:
        "Rentwin ile Aliağa ve İzmir'de bakımlı filodan uygun fiyatlı araç kiralayın. Ek ücret sürprizi yok, sorunsuz teslimat, dakikalar içinde online rezervasyon.",
      jsonLd: (locale) => [webSiteLd(locale)],
    },
    "/vehicles": {
      title: "Kiralık Araçlar | Rentwin Araç Kiralama",
      description:
        "Geniş kiralık araç filomuzu inceleyin: ekonomik, aile ve lüks segmentte güvenilir araçlar. Hemen uygun aracı seçin, online rezervasyon yapın.",
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
      title: "Rentwin | Car Rental in Aliağa & İzmir — Transparent Pricing",
      description:
        "Rent a well-maintained car in Aliağa and İzmir with Rentwin. No hidden fees, smooth handover, book online in minutes.",
      jsonLd: (locale) => [webSiteLd(locale)],
    },
    "/vehicles": {
      title: "Rental Cars | Rentwin Car Rental",
      description:
        "Browse our full rental fleet: reliable economy, family, and luxury vehicles. Pick the right car and book online in minutes.",
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
 * @returns {{title,description,canonical,ogImage,ogType,ogLocale,ogLocaleAlt,htmlLang,robots,jsonLd:object[],bodyHtml?:string}}
 */
const buildHead = ({
  path,
  vehicle,
  vehicleMissing,
  related,
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
    return {
      ...base(path),
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
    return {
      ...base(path),
      title:
        locale === "en"
          ? `${locationName} Car Rental | Rentwin`
          : `${locationName} Araç Kiralama | Rentwin`,
      description:
        locale === "en"
          ? `Affordable, well-maintained rental cars in ${locationName}. Book online with Rentwin and pick up your car at ${locationName}.`
          : `${locationName} bölgesinde uygun fiyatlı ve bakımlı kiralık araçlar. Rentwin güvencesiyle online rezervasyon yapın, aracınızı ${locationName} noktasından teslim alın.`,
      jsonLd: [
        breadcrumbLd(
          [
            { name: nav.home, path: "/" },
            { name: locale === "en" ? "Our Locations" : "Lokasyonlarımız", path: "/lokasyonlar" },
            { name: locationName },
          ],
          locale
        ),
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
    return {
      ...base(path),
      title: `${post.title} | Rentwin ${locale === "en" ? "Blog" : "Blog"}`,
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
        articleLd({ ...post, path: canonicalPath, locale }),
      ],
      bodyHtml: renderBlogPostBody({ post }, locale),
    };
  }

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
              url: `${SITE_URL}${localizePath(`/blog/${p.slug}`, locale)}`,
            })),
          })
        );
      }
      head.bodyHtml = renderBlogListBody(posts || [], locale);
    }

    if (canonicalPath === "/" || canonicalPath === "/yorumlar") {
      head.jsonLd.push(autoRentalLd({ reviewSummary, reviews }));
    }

    if (canonicalPath === "/sss") head.bodyHtml = renderFaqBody(locale);
    if (canonicalPath === "/about") head.bodyHtml = renderAboutBody(locale);
    if (canonicalPath === "/contact") head.bodyHtml = renderContactBody(locale);

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
  vehicleLd,
  articleLd,
  reviewLd,
  FAQ_ITEMS,
};
