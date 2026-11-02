const test = require("node:test");
const assert = require("node:assert/strict");
const { autoRentalLd, buildHead } = require("./seo-ld");
const trHomeCopy = require("../../../src/i18n/locales/tr/home.json");
const enHomeCopy = require("../../../src/i18n/locales/en/home.json");
const trVehiclesCopy = require("../../../src/i18n/locales/tr/vehicles.json");
const enVehiclesCopy = require("../../../src/i18n/locales/en/vehicles.json");

const cases = [
  { path: "/vehicles", heading: "Araçlarımız" },
  { path: "/en/vehicles", heading: "Our Vehicles" },
  { path: "/lokasyonlar", heading: "Lokasyonlarımız" },
  { path: "/en/lokasyonlar", heading: "Our Locations" },
  { path: "/blog", heading: "Blog" },
  { path: "/en/blog", heading: "Blog" },
  { path: "/sss", heading: "Sıkça Sorulan Sorular" },
  { path: "/en/sss", heading: "Frequently Asked Questions" },
  { path: "/contact", heading: "İletişim" },
  { path: "/en/contact", heading: "Contact Us" },
  { path: "/en", heading: "Car Rental in Aliağa" },
  { path: "/privacy-policy", heading: "Gizlilik ve Kişisel Verilerin Korunması Politikası" },
  { path: "/en/privacy-policy", heading: "Privacy &amp; Personal Data Protection Policy" },
];

for (const { path, heading } of cases) {
  test(`crawler body for ${path} includes its localized H1`, () => {
    const { bodyHtml } = buildHead({ path });
    const headings = bodyHtml.match(/<h1>/g) || [];
    assert.equal(headings.length, 1);
    assert.ok(bodyHtml.includes(`<h1>${heading}</h1>`));
  });
}

for (const path of ["/en", "/privacy-policy", "/en/privacy-policy"]) {
  test(`crawler body for ${path} includes meaningful page content`, () => {
    const { bodyHtml } = buildHead({ path });
    assert.ok(bodyHtml.length > 500);
    assert.match(bodyHtml, /<p>[^<]{40,}<\/p>/);
  });
}

for (const [path, locale] of [
  ["/lokasyonlar/aliaga", "tr"],
  ["/en/lokasyonlar/aliaga", "en"],
  ["/lokasyonlar/izmir-havalimani", "tr"],
  ["/en/lokasyonlar/izmir-havalimani", "en"],
]) {
  test(`crawler location body for ${path} includes localized local guidance`, () => {
    const slug = path.includes("izmir-havalimani") ? "izmir-havalimani" : "aliaga";
    const name = slug === "aliaga" ? "Aliağa" : "İzmir Havalimanı";
    const { bodyHtml } = buildHead({ path, locationName: name, slug });
    const expectedTitle =
      slug === "aliaga"
        ? locale === "en"
          ? "Renting a car in Aliağa"
          : "Aliağa'da araç kiralama hakkında"
        : locale === "en"
          ? "Car rental at İzmir Adnan Menderes Airport"
          : "İzmir Adnan Menderes Havalimanı araç kiralama";
    assert.ok(bodyHtml.includes(expectedTitle));
    if (slug === "aliaga") assert.ok(bodyHtml.includes("356 Sk."));
  });
}

test("business structured data uses the confirmed Aliağa address coordinates", () => {
  assert.deepEqual(autoRentalLd().geo, {
    "@type": "GeoCoordinates",
    latitude: 38.7928859,
    longitude: 26.9683881,
  });
});

test("home and vehicle metadata target local rental searches in both languages", () => {
  const trHome = buildHead({ path: "/" });
  const enHome = buildHead({ path: "/en" });
  const trVehicles = buildHead({ path: "/vehicles" });
  const enVehicles = buildHead({ path: "/en/vehicles" });

  assert.equal(trHome.title, trHomeCopy.seo.title);
  assert.equal(enHome.title, enHomeCopy.seo.title);
  assert.equal(trHome.description, trHomeCopy.seo.description);
  assert.equal(enHome.description, enHomeCopy.seo.description);
  assert.equal(trVehicles.title, trVehiclesCopy.seoTitle);
  assert.equal(enVehicles.title, enVehiclesCopy.seoTitle);
  assert.equal(trVehicles.description, trVehiclesCopy.seoDescription);
  assert.equal(enVehicles.description, enVehiclesCopy.seoDescription);
  assert.match(trHome.title, /Aliağa Araç Kiralama/);
  assert.match(enHome.title, /Car Rental in Aliağa/);
  for (const page of [trHome, enHome, trVehicles, enVehicles]) {
    assert.match(page.description, /Adnan Menderes Airport|Adnan Menderes Havalimanı/);
  }
});
