const test = require("node:test");
const assert = require("node:assert/strict");
const { buildHead } = require("./seo-ld");

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
];

for (const { path, heading } of cases) {
  test(`crawler body for ${path} includes its localized H1`, () => {
    const { bodyHtml } = buildHead({ path });
    const headings = bodyHtml.match(/<h1>/g) || [];
    assert.equal(headings.length, 1);
    assert.ok(bodyHtml.includes(`<h1>${heading}</h1>`));
  });
}
