const test = require("node:test");
const assert = require("node:assert/strict");
const { renderPage, renderHeadTags } = require("./prerender.controller");
const { buildHead } = require("../../lib/seo-ld");
const { SITE_URL } = require("../../lib/site");

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
