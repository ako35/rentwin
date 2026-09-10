import { constants } from "../constants";
import { SITE_URL } from "../hooks/use-page-meta";

// (kept in src/utils as a standalone module, like fuel-eighths.js)

const { website } = constants;

const postalAddress = {
  "@type": "PostalAddress",
  streetAddress: website.streetAddress,
  addressLocality: website.addressLocality,
  addressRegion: website.addressRegion,
  postalCode: website.postalCode,
  addressCountry: website.addressCountry,
};

const openingHoursSpecification = website.openingHours.map((slot) => ({
  "@type": "OpeningHoursSpecification",
  dayOfWeek: slot.days,
  opens: slot.opens,
  closes: slot.closes,
}));

// The primary business entity — reused as the base for the home page and the
// static block in index.html.
export const autoRentalLd = () => ({
  "@context": "https://schema.org",
  "@type": "AutoRental",
  "@id": `${SITE_URL}/#organization`,
  name: website.name,
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/logo_full.png`,
  image: `${SITE_URL}/logo_full.png`,
  email: website.email,
  telephone: website.phoneE164,
  address: postalAddress,
  ...(website.geo
    ? { geo: { "@type": "GeoCoordinates", latitude: website.geo.latitude, longitude: website.geo.longitude } }
    : {}),
  hasMap: website.mapUrl,
  areaServed: [
    { "@type": "State", name: "İzmir" },
    { "@type": "Country", name: "Türkiye" },
  ],
  priceRange: "₺₺",
  currenciesAccepted: "TRY",
  openingHoursSpecification,
  ...(website.sameAs?.length ? { sameAs: website.sameAs } : {}),
});

export const webSiteLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: `${SITE_URL}/`,
  name: website.name,
  inLanguage: "tr-TR",
  publisher: { "@id": `${SITE_URL}/#organization` },
});

// items: [{ q, a }] — plain-text question / answer pairs.
export const faqLd = (items) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
});

// items: [{ name, path }] — the current page is the last item.
export const breadcrumbLd = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    ...(item.path ? { item: `${SITE_URL}${item.path}` } : {}),
  })),
});

export const vehicleLd = ({
  name,
  brand,
  model,
  image,
  transmission,
  fuelType,
  modelYear,
  color,
  path,
}) => ({
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
    seller: { "@id": `${SITE_URL}/#organization` },
  },
});
