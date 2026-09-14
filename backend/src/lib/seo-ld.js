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

const vehicleLd = ({ name, brand, model, image, transmission, fuelType, modelYear, color, path, locale = "tr" }) => ({
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
 * @param {string} [args.locationName]     resolved Location.name for /lokasyonlar/:slug
 * @param {boolean} [args.locationMissing] path was /lokasyonlar/:slug but no match
 * @param {object} [args.post]      { title, excerpt, image, publishedAt, updatedAt } for /blog/:slug
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
  locationName,
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

    if (canonicalPath === "/vehicles" && vehicles && vehicles.length) {
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

    if (canonicalPath === "/lokasyonlar" && locations && locations.length) {
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

    if (canonicalPath === "/blog" && posts && posts.length) {
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

    if (canonicalPath === "/" || canonicalPath === "/yorumlar") {
      head.jsonLd.push(autoRentalLd({ reviewSummary, reviews }));
    }

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
