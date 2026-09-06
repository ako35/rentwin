const prisma = require("../../lib/prisma");
const asyncHandler = require("../../middleware/async-handler");

const SITE_URL = (process.env.PUBLIC_SITE_URL || "https://rentwin.com.tr").replace(/\/+$/, "");

// Mirrors src/utils/functions/functions.js slugify so location URLs match the SPA.
const slugify = (value = "") => {
  const map = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", İ: "i", I: "i" };
  return value
    .toString()
    .trim()
    .replace(/[çğıöşüİI]/g, (c) => map[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const STATIC_ROUTES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/vehicles", changefreq: "daily", priority: "0.9" },
  { path: "/lokasyonlar", changefreq: "weekly", priority: "0.7" },
  { path: "/about", changefreq: "monthly", priority: "0.5" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
];

const urlEntry = ({ path, lastmod, changefreq, priority }) =>
  [
    "  <url>",
    `    <loc>${SITE_URL}${path}</loc>`,
    lastmod ? `    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");

// Dynamic sitemap: static pages + every in-service vehicle + every location.
const getSitemap = asyncHandler(async (req, res) => {
  const [vehicles, locations] = await Promise.all([
    prisma.vehicle.findMany({
      where: { outOfService: false },
      select: { id: true, updatedAt: true },
    }),
    prisma.location.findMany({ select: { name: true, createdAt: true } }),
  ]);

  const entries = [
    ...STATIC_ROUTES,
    ...vehicles.map((v) => ({
      path: `/vehicles/${v.id}`,
      lastmod: v.updatedAt,
      changefreq: "weekly",
      priority: "0.8",
    })),
    ...locations.map((l) => ({
      path: `/lokasyonlar/${slugify(l.name)}`,
      lastmod: l.createdAt,
      changefreq: "monthly",
      priority: "0.6",
    })),
  ];

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.map(urlEntry).join("\n") +
    "\n</urlset>\n";

  res.set("Content-Type", "application/xml; charset=utf-8");
  res.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
  res.send(xml);
});

module.exports = { getSitemap };
