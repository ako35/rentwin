// Backend port of src/utils/seo.js + the per-route <head> copy that lives in the
// page components' usePageMeta(...) calls and the i18n locale files
// (src/i18n/locales/tr/*.json). Used only by the bot prerender
// (modules/prerender) so crawlers and social scrapers that do not run JS get the
// same title / description / canonical / OG tags / JSON-LD a browser ends up
// with after React hydrates.
//
// KEEP IN SYNC with the frontend. When you change a page's seoTitle /
// seoDescription in a locale file, or a JSON-LD shape in src/utils/seo.js,
// mirror it here.

const { SITE_URL, business } = require("./site");

const ORG_ID = `${SITE_URL}/#organization`;
const DEFAULT_IMAGE = `${SITE_URL}/logo_full.png`;

/* ------------------------------------------------------------------ JSON-LD */

const autoRentalLd = () => ({
  "@context": "https://schema.org",
  "@type": "AutoRental",
  "@id": ORG_ID,
  name: business.name,
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/logo_full.png`,
  image: `${SITE_URL}/logo_full.png`,
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
});

const webSiteLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: `${SITE_URL}/`,
  name: business.name,
  inLanguage: "tr-TR",
  publisher: { "@id": ORG_ID },
});

const breadcrumbLd = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    ...(item.path ? { item: `${SITE_URL}${item.path}` } : {}),
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

const vehicleLd = ({ name, brand, model, image, transmission, fuelType, modelYear, color, path }) => ({
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
  url: `${SITE_URL}${path}`,
  offers: {
    "@type": "Offer",
    availability: "https://schema.org/InStock",
    priceCurrency: "TRY",
    businessFunction: "https://schema.org/LeaseOut",
    seller: { "@id": ORG_ID },
  },
});

/* --------------------------------------------------- per-route <head> copy  */
// Mirrors src/i18n/locales/tr/{home,vehicles,locations,about,contact,faq}.json
// and src/i18n/locales/tr/common.json (privacyPolicy + nav labels).

const NAV = { home: "Ana Sayfa", vehicles: "Araçlar" };

const FAQ_ITEMS = [
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
];

const STATIC_META = {
  "/": {
    title: "Rentwin | Aliağa & İzmir Araç Kiralama — Şeffaf Fiyat",
    description:
      "Rentwin ile Aliağa ve İzmir'de bakımlı filodan uygun fiyatlı araç kiralayın. Ek ücret sürprizi yok, sorunsuz teslimat, dakikalar içinde online rezervasyon.",
    jsonLd: () => [webSiteLd()],
  },
  "/vehicles": {
    title: "Kiralık Araçlar | Rentwin Araç Kiralama",
    description:
      "Geniş kiralık araç filomuzu inceleyin: ekonomik, aile ve lüks segmentte güvenilir araçlar. Hemen uygun aracı seçin, online rezervasyon yapın.",
    jsonLd: () => [
      breadcrumbLd([{ name: NAV.home, path: "/" }, { name: "Araçlarımız" }]),
    ],
  },
  "/lokasyonlar": {
    title: "Araç Kiralama Lokasyonları | Rentwin",
    description:
      "Rentwin'in araç kiralama hizmeti verdiği tüm lokasyonlar. Bulunduğunuz bölgeyi seçin, uygun fiyatlı ve bakımlı kiralık araçları keşfedin.",
    jsonLd: () => [
      breadcrumbLd([{ name: NAV.home, path: "/" }, { name: "Lokasyonlarımız" }]),
    ],
  },
  "/about": {
    title: "Hakkımızda | Rentwin Araç Kiralama",
    description:
      "Rentwin'i tanıyın: bireysel ve kurumsal müşterilere hızlı, şeffaf ve dijital araç kiralama ile filo yönetimi çözümleri sunuyoruz.",
    jsonLd: () => [
      breadcrumbLd([{ name: NAV.home, path: "/" }, { name: "Hakkımızda" }]),
    ],
  },
  "/contact": {
    title: "İletişim | Rentwin Araç Kiralama",
    description:
      "Rentwin müşteri hizmetleri ekibine ulaşın. Rezervasyon, sorularınız ve geri bildirimleriniz için bize her zaman yazabilirsiniz.",
    jsonLd: () => [
      breadcrumbLd([{ name: NAV.home, path: "/" }, { name: "İletişim" }]),
    ],
  },
  "/sss": {
    title: "Sıkça Sorulan Sorular | Rentwin Araç Kiralama",
    description:
      "Rentwin araç kiralama hakkında merak edilenler: kiralama yaşı, gerekli belgeler, depozito, kilometre limiti, yakıt politikası, HGS geçişleri ve daha fazlası.",
    jsonLd: () => [
      breadcrumbLd([{ name: NAV.home, path: "/" }, { name: "Sıkça Sorulan Sorular" }]),
      faqLd(FAQ_ITEMS),
    ],
  },
  "/privacy-policy": {
    title: "Gizlilik ve Kişisel Verilerin Korunması Politikası",
    description:
      "Rentwin markası altında sunulan araç kiralama ve rezervasyon hizmetlerinde kişisel verilerinizin KVKK kapsamında nasıl işlendiğine dair aydınlatma metni.",
    jsonLd: () => [],
  },
};

/* --------------------------------------------------------------- buildHead  */

const base = (path) => ({
  url: `${SITE_URL}${path}`,
  title: STATIC_META["/"].title,
  description: STATIC_META["/"].description,
  canonical: `${SITE_URL}${path}`,
  ogImage: DEFAULT_IMAGE,
  ogType: "website",
  robots: "index, follow",
  jsonLd: [],
});

const noindex = (head) => ({ ...head, canonical: null, robots: "noindex, nofollow" });

/**
 * @param {object} args
 * @param {string} args.path      normalized request path, no trailing slash ("/" stays "/")
 * @param {object} [args.vehicle] { id, name, brand, model, image, transmission, fuelType, modelYear, color } or null
 * @param {boolean} [args.vehicleMissing]  path was /vehicles/:id but no such vehicle
 * @param {string} [args.locationName]     resolved Location.name for /lokasyonlar/:slug
 * @param {boolean} [args.locationMissing] path was /lokasyonlar/:slug but no match
 * @returns {{title,description,canonical,ogImage,ogType,robots,jsonLd:object[]}}
 */
const buildHead = ({ path, vehicle, vehicleMissing, locationName, locationMissing }) => {
  // vehicle detail
  if (/^\/vehicles\/[^/]+$/.test(path)) {
    if (vehicleMissing || !vehicle) {
      return noindex({ ...base(path), title: "Araç Detayı | Rentwin Araç Kiralama" });
    }
    const name = vehicle.name;
    return {
      ...base(path),
      title: `${name} Kiralama | Rentwin`,
      description: `${name} aracını Rentwin güvencesiyle kiralayın. Uygun fiyat, sorunsuz teslimat ve güvenilir hizmet için hemen rezervasyon yapın.`,
      ogImage: vehicle.image || DEFAULT_IMAGE,
      ogType: "product",
      jsonLd: [
        breadcrumbLd([
          { name: NAV.home, path: "/" },
          { name: NAV.vehicles, path: "/vehicles" },
          { name },
        ]),
        vehicleLd({ ...vehicle, path }),
      ],
    };
  }

  // location detail
  if (/^\/lokasyonlar\/[^/]+$/.test(path)) {
    if (locationMissing || !locationName) {
      return noindex({ ...base(path), title: "Araç Kiralama Lokasyonları | Rentwin" });
    }
    return {
      ...base(path),
      title: `${locationName} Araç Kiralama | Rentwin`,
      description: `${locationName} bölgesinde uygun fiyatlı ve bakımlı kiralık araçlar. Rentwin güvencesiyle online rezervasyon yapın, aracınızı ${locationName} noktasından teslim alın.`,
      jsonLd: [
        breadcrumbLd([
          { name: NAV.home, path: "/" },
          { name: "Lokasyonlarımız", path: "/lokasyonlar" },
          { name: locationName },
        ]),
      ],
    };
  }

  // static routes
  const meta = STATIC_META[path];
  if (meta) {
    return {
      ...base(path),
      title: meta.title,
      description: meta.description,
      jsonLd: meta.jsonLd(),
    };
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
  vehicleLd,
  FAQ_ITEMS,
};
