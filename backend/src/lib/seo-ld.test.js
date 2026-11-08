const test = require("node:test");
const assert = require("node:assert/strict");
const { autoRentalLd, buildHead } = require("./seo-ld");
const { SITE_URL } = require("./site");
const trHomeCopy = require("../../../src/i18n/locales/tr/home.json");
const enHomeCopy = require("../../../src/i18n/locales/en/home.json");
const trVehiclesCopy = require("../../../src/i18n/locales/tr/vehicles.json");
const enVehiclesCopy = require("../../../src/i18n/locales/en/vehicles.json");
const trLocationsCopy = require("../../../src/i18n/locales/tr/locations.json");
const enLocationsCopy = require("../../../src/i18n/locales/en/locations.json");

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

test("crawler location body for Bursa explains address delivery in both languages", () => {
  const tr = buildHead({
    path: "/lokasyonlar/bursa",
    locationName: "Bursa",
    slug: "bursa",
  }).bodyHtml;
  const en = buildHead({
    path: "/en/lokasyonlar/bursa",
    locationName: "Bursa",
    slug: "bursa",
  }).bodyHtml;

  assert.match(tr, /müşteriyle belirlenen adrese teslim edilir/);
  assert.match(en, /delivered to an address agreed with the customer/);
  assert.doesNotMatch(en, /Fast pick-up and drop-off at Bursa/);
});

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

// LOCATION_META_OVERRIDES (backend) must stay in sync with the client's
// locations.json detail.overrides, or a bot and a browser see different
// <title>/H1 for the same URL.
for (const [prefix, copy] of [
  ["", trLocationsCopy],
  ["/en", enLocationsCopy],
]) {
  for (const [slug, override] of Object.entries(copy.detail.overrides)) {
    test(`location override for ${prefix}/lokasyonlar/${slug} mirrors the client copy`, () => {
      const head = buildHead({ path: `${prefix}/lokasyonlar/${slug}`, locationName: slug, slug });
      assert.equal(head.title, override.seoTitle);
      assert.equal(head.description, override.seoDescription);
      assert.ok(head.bodyHtml.includes(`<h1>${override.heading}</h1>`));
    });
  }
}

test("Aliağa location page no longer competes with the homepage title", () => {
  for (const [home, location] of [
    ["/", "/lokasyonlar/aliaga"],
    ["/en", "/en/lokasyonlar/aliaga"],
  ]) {
    const homeHead = buildHead({ path: home });
    const locationHead = buildHead({ path: location, locationName: "Aliağa", slug: "aliaga" });
    assert.notEqual(locationHead.title, homeHead.title);
    assert.doesNotMatch(locationHead.title, /Aliağa Araç Kiralama|Car Rental in Aliağa|Aliağa Car Rental/);
  }
});

test("locations without an override keep the templated title and H1", () => {
  const tr = buildHead({ path: "/lokasyonlar/bursa", locationName: "Bursa", slug: "bursa" });
  const en = buildHead({ path: "/en/lokasyonlar/bursa", locationName: "Bursa", slug: "bursa" });
  assert.equal(tr.title, "Bursa Araç Kiralama | Rentwin");
  assert.equal(en.title, "Bursa Car Rental | Rentwin");
  assert.ok(tr.bodyHtml.includes("<h1>Bursa Araç Kiralama</h1>"));
});

const samplePost = {
  title: "Kış Lastiği Rehberi",
  excerpt: "Kış aylarında kiralık araçla güvenli sürüş için bilmeniz gerekenler.",
  content: "<p>İçerik</p>",
  image: null,
  publishedAt: new Date("2026-10-01T09:00:00Z"),
  updatedAt: new Date("2026-10-05T09:00:00Z"),
};

for (const path of ["/blog/kis-lastigi-rehberi", "/en/blog/kis-lastigi-rehberi"]) {
  test(`blog post ${path} is Turkish-only and canonicalizes to the TR URL`, () => {
    const head = buildHead({ path, post: samplePost });
    const trUrl = `${SITE_URL}/blog/kis-lastigi-rehberi`;
    assert.equal(head.canonical, trUrl);
    assert.equal(head.htmlLang, "tr");
    assert.equal(head.ogLocale, "tr_TR");
    assert.equal(head.ogLocaleAlt, null);
    assert.equal(head.monolingual, true);
    assert.equal(head.robots, "index, follow");
    const article = head.jsonLd.find((block) => block["@type"] === "BlogPosting");
    assert.equal(article.inLanguage, "tr-TR");
    assert.equal(article.mainEntityOfPage, trUrl);
  });
}

test("missing blog post stays noindex without a canonical", () => {
  const head = buildHead({ path: "/en/blog/yok", postMissing: true });
  assert.equal(head.canonical, null);
  assert.equal(head.robots, "noindex, nofollow");
});

test("blog list points every post at its TR canonical URL on both routes", () => {
  const posts = [{ slug: "kis-lastigi-rehberi", title: "Kış Lastiği Rehberi" }];
  for (const path of ["/blog", "/en/blog"]) {
    const head = buildHead({ path, posts });
    const list = head.jsonLd.find((block) => block["@type"] === "ItemList");
    assert.equal(list.itemListElement[0].url, `${SITE_URL}/blog/kis-lastigi-rehberi`);
    assert.ok(head.bodyHtml.includes(`href="${SITE_URL}/blog/kis-lastigi-rehberi"`));
    assert.ok(!head.bodyHtml.includes("/en/blog/kis-lastigi-rehberi"));
  }
});
