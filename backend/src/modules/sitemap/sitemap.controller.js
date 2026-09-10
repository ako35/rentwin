const prisma = require("../../lib/prisma");
const asyncHandler = require("../../middleware/async-handler");
const { modelImageKey } = require("../../lib/serializers");
const { loadModelImageMap } = require("../vehicles/vehicles.shared");
const { SITE_URL, slugify } = require("../../lib/site");

const STATIC_ROUTES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/vehicles", changefreq: "daily", priority: "0.9" },
  { path: "/lokasyonlar", changefreq: "weekly", priority: "0.7" },
  { path: "/kampanyalar", changefreq: "weekly", priority: "0.6" },
  { path: "/about", changefreq: "monthly", priority: "0.5" },
  { path: "/sss", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
];

const xmlEscape = (s = "") =>
  s.replace(/[<>&'"]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[ch]));

const urlEntry = ({ path, lastmod, changefreq, priority, image }) =>
  [
    "  <url>",
    `    <loc>${SITE_URL}${path}</loc>`,
    lastmod ? `    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    image ? `    <image:image><image:loc>${xmlEscape(image)}</image:loc></image:image>` : null,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");

// Dynamic sitemap: static pages + every in-service vehicle + every location.
const getSitemap = asyncHandler(async (req, res) => {
  const [vehicles, locations, modelImages] = await Promise.all([
    prisma.vehicle.findMany({
      where: { outOfService: false, soldAt: null },
      select: {
        id: true,
        brand: true,
        model: true,
        updatedAt: true,
        images: { select: { blobUrl: true }, orderBy: { createdAt: "asc" }, take: 1 },
      },
    }),
    prisma.location.findMany({ select: { name: true, createdAt: true } }),
    loadModelImageMap(),
  ]);

  const vehicleImage = (v) =>
    modelImages.get(modelImageKey(v.brand, v.model))?.blobUrl || v.images[0]?.blobUrl;

  // The listing pages are as fresh as the most recently touched vehicle.
  const fleetLastmod = vehicles.reduce(
    (max, v) => (v.updatedAt > max ? v.updatedAt : max),
    new Date(0)
  );
  const staticLastmod = fleetLastmod.getTime() ? fleetLastmod : new Date();

  const entries = [
    ...STATIC_ROUTES.map((r) =>
      r.path === "/" || r.path === "/vehicles" ? { ...r, lastmod: staticLastmod } : r
    ),
    ...vehicles.map((v) => ({
      path: `/vehicles/${v.id}`,
      lastmod: v.updatedAt,
      changefreq: "weekly",
      priority: "0.8",
      image: vehicleImage(v),
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
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"' +
    ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
    entries.map(urlEntry).join("\n") +
    "\n</urlset>\n";

  res.set("Content-Type", "application/xml; charset=utf-8");
  res.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
  res.send(xml);
});

module.exports = { getSitemap };
