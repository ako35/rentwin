const test = require("node:test");
const assert = require("node:assert/strict");
const { renderPage, renderHeadTags, renderLd, inject } = require("./prerender.controller");
const { buildHead } = require("../../lib/seo-ld");
const { SITE_URL } = require("../../lib/site");
const trHomeCopy = require("../../../../src/i18n/locales/tr/home.json");
const enHomeCopy = require("../../../../src/i18n/locales/en/home.json");

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A cut-down index.html: SEO markers plus the TR homepage-hero snapshot,
// which has nested <div>s of its own.
const SHELL =
  '<!DOCTYPE html><html lang="tr"><head><!--SEO:START--><!--SEO:END--><!--SEO:LD--></head><body>' +
  '<div id="root"><section class="home-hero"><div class="container"><div class="home-hero__copy">' +
  '<h1 class="home-hero__title">Aliağa Araç Kiralama</h1></div></div></section></div>' +
  "<script>/* app */</script></body></html>";

const rootOf = (html) => html.slice(html.indexOf('<div id="root">'), html.indexOf("<script>"));

test("bare / keeps the hero snapshot and appends the rest of the homepage", () => {
  const root = rootOf(inject(SHELL, buildHead({ path: "/" })));
  assert.equal((root.match(/<h1\b/g) || []).length, 1);
  assert.ok(root.indexOf("home-hero__title") < root.indexOf(`<h2>${trHomeCopy.localGuide.title}</h2>`));
  for (const paragraph of trHomeCopy.localGuide.paragraphs) {
    assert.ok(root.includes(paragraph.replace(/"/g, "&quot;")), paragraph);
  }
  assert.ok(root.includes(`href="${SITE_URL}/lokasyonlar/aliaga"`));
  assert.ok(root.includes(`href="${SITE_URL}/arac-kiralama-fiyatlari"`));
  assert.ok(root.endsWith("</div>"), "appended content stays inside #root");
});

test("/en swaps the Turkish snapshot for its own English homepage body", () => {
  const root = rootOf(inject(SHELL, buildHead({ path: "/en" })));
  assert.doesNotMatch(root, /home-hero__title/);
  assert.ok(root.includes(`<h1>${enHomeCopy.hero.title}</h1>`));
  assert.ok(root.includes(`<h2>${enHomeCopy.localGuide.title}</h2>`));
  assert.ok(root.includes(`href="${SITE_URL}/en/lokasyonlar/aliaga"`));
});

test("Turkish-only blog post head has no hreflang pair or og:locale:alternate", () => {
  const html = renderHeadTags(
    buildHead({
      path: "/en/blog/kis-lastigi-rehberi",
      post: {
        title: "Kış Lastiği Rehberi",
        excerpt: "Kış aylarında güvenli sürüş.",
        content: "<p>İçerik</p>",
        image: null,
        publishedAt: new Date("2026-10-01T09:00:00Z"),
        updatedAt: new Date("2026-10-05T09:00:00Z"),
      },
    })
  );
  const trUrl = escapeRe(`${SITE_URL}/blog/kis-lastigi-rehberi`);
  assert.match(html, new RegExp(`<link rel="canonical" href="${trUrl}" />`));
  assert.match(html, new RegExp(`<meta property="og:url" content="${trUrl}" />`));
  assert.match(html, /<meta property="og:locale" content="tr_TR" \/>/);
  assert.doesNotMatch(html, /hreflang=/);
  assert.doesNotMatch(html, /og:locale:alternate/);
});

test("bilingual page head keeps its TR/EN hreflang pair", () => {
  const html = renderHeadTags(buildHead({ path: "/en/vehicles" }));
  assert.match(html, new RegExp(`hreflang="tr" href="${escapeRe(`${SITE_URL}/vehicles`)}"`));
  assert.match(html, new RegExp(`hreflang="en" href="${escapeRe(`${SITE_URL}/en/vehicles`)}"`));
  assert.match(html, new RegExp(`hreflang="x-default" href="${escapeRe(`${SITE_URL}/vehicles`)}"`));
  assert.match(html, /<meta property="og:locale:alternate" content="tr_TR" \/>/);
});

const vehicle = {
  id: "t1",
  name: "FORD TRANSİT ÇİFT KABİN",
  brand: "FORD",
  model: "TRANSİT ÇİFT KABİN",
  transmission: "Manual",
  fuelType: "Diesel",
  modelYear: 2023,
};

test("Turkish vehicle page is indexable with its canonical but no hreflang pair", () => {
  const html = renderHeadTags(buildHead({ path: "/vehicles/t2", vehicle, canonicalVehicleId: "t1" }));
  assert.match(html, /<meta name="robots" content="index, follow" \/>/);
  assert.match(html, new RegExp(`<link rel="canonical" href="${escapeRe(`${SITE_URL}/vehicles/t1`)}" />`));
  assert.doesNotMatch(html, /hreflang=/);
});

test("English vehicle page is noindex, follow with no canonical or hreflang", () => {
  const head = buildHead({ path: "/en/vehicles/t1", vehicle });
  const html = renderHeadTags(head);
  assert.match(html, /<meta name="robots" content="noindex, follow" \/>/);
  assert.doesNotMatch(html, /rel="canonical"/);
  assert.doesNotMatch(html, /hreflang=/);
  // Still a full English page for whoever lands on it.
  assert.match(html, /<title>Rent a FORD TRANSİT ÇİFT KABİN \| Rentwin<\/title>/);
  assert.ok(head.bodyHtml && head.bodyHtml.length > 0);
});

test("prerender failures return 503 instead of an empty page with 200", async (t) => {
  const originalFetch = global.fetch;
  const originalConsoleError = console.error;
  const errors = [];
  t.after(() => {
    global.fetch = originalFetch;
    console.error = originalConsoleError;
  });
  global.fetch = async () => {
    throw new Error("shell unavailable");
  };
  console.error = (...args) => errors.push(args);

  const headers = {};
  const response = {
    statusCode: null,
    body: null,
    set(name, value) {
      headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
  };

  await renderPage({ path: "/not-found" }, response);

  assert.equal(response.statusCode, 503);
  assert.equal(headers["Cache-Control"], "no-store");
  assert.equal(headers["Retry-After"], "60");
  assert.match(response.body, /noindex, nofollow/);
  assert.equal(errors.length, 1);
  assert.match(errors[0][1].message, /shell unavailable/);
});

test("JSON-LD from a visitor review cannot close its script tag", () => {
  const review = { "@type": "Review", reviewBody: "Harika</script><script>alert(1)</script>" };
  const html = renderLd([review]);
  // Exactly one closing tag: the block's own.
  assert.equal(html.match(/<\/script>/g).length, 1);
  const json = html.replace(/^<script type="application\/ld\+json">\n/, "").replace(/\n<\/script>$/, "");
  assert.deepEqual(JSON.parse(json), review);
});
