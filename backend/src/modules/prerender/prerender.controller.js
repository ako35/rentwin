// Bot prerender. JS-less crawlers and social scrapers (Googlebot's first pass,
// facebookexternalhit, WhatsApp, Slackbot, Twitterbot, LinkedInBot, …) are
// routed here by vercel.json for a small set of public paths. Everyone else —
// every human browser — is never routed here and gets the untouched SPA shell.
//
// We fetch the built index.html once (cached), swap the tags between the
// <!--SEO:START--> / <!--SEO:END--> markers for this page's real title /
// description / canonical / OG tags, drop the page's JSON-LD in after
// <!--SEO:LD-->, and return it. Any failure falls back to the raw shell with a
// 200 so a bot still gets a working page.

const prisma = require("../../lib/prisma");
const { SITE_URL, slugify } = require("../../lib/site");
const { buildHead } = require("../../lib/seo-ld");
const { modelImageKey } = require("../../lib/serializers");
const { loadModelImageMap } = require("../vehicles/vehicles.shared");

const SHELL_URL = process.env.PRERENDER_SHELL_URL || `${SITE_URL}/index.html`;
const SHELL_TTL_MS = 10 * 60 * 1000;

let shellCache = { html: null, at: 0 };

const getShell = async () => {
  const now = Date.now();
  if (shellCache.html && now - shellCache.at < SHELL_TTL_MS) return shellCache.html;

  const res = await fetch(SHELL_URL, { headers: { "user-agent": "RentwinPrerender/1.0" } });
  if (!res.ok) throw new Error(`shell fetch ${res.status}`);
  const html = await res.text();
  if (!/<!--SEO:START-->/.test(html)) throw new Error("shell has no SEO markers");

  shellCache = { html, at: now };
  return html;
};

const esc = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const renderHeadTags = (h) => {
  const ogUrl = h.canonical || h.url;
  return [
    `<title>${esc(h.title)}</title>`,
    `<meta name="description" content="${esc(h.description)}" />`,
    `<meta name="robots" content="${esc(h.robots)}" />`,
    h.canonical ? `<link rel="canonical" href="${esc(h.canonical)}" />` : null,
    `<meta property="og:type" content="${esc(h.ogType)}" />`,
    `<meta property="og:site_name" content="Rentwin" />`,
    `<meta property="og:title" content="${esc(h.title)}" />`,
    `<meta property="og:description" content="${esc(h.description)}" />`,
    `<meta property="og:url" content="${esc(ogUrl)}" />`,
    `<meta property="og:image" content="${esc(h.ogImage)}" />`,
    `<meta property="og:image:alt" content="${esc(h.title)}" />`,
    h.ogImageDefault ? `<meta property="og:image:width" content="1200" />` : null,
    h.ogImageDefault ? `<meta property="og:image:height" content="630" />` : null,
    `<meta property="og:locale" content="tr_TR" />`,
    `<meta property="og:locale:alternate" content="en_US" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(h.title)}" />`,
    `<meta name="twitter:description" content="${esc(h.description)}" />`,
    `<meta name="twitter:image" content="${esc(h.ogImage)}" />`,
    `<meta name="twitter:image:alt" content="${esc(h.title)}" />`,
  ]
    .filter(Boolean)
    .join("\n    ");
};

const renderLd = (blocks) =>
  blocks
    .map((data) => `<script type="application/ld+json">\n${JSON.stringify(data)}\n</script>`)
    .join("\n  ");

const inject = (shell, head) => {
  let html = shell.replace(
    /<!--SEO:START-->[\s\S]*?<!--SEO:END-->/,
    `<!--SEO:START-->\n    ${renderHeadTags(head)}\n    <!--SEO:END-->`
  );
  if (head.jsonLd.length) {
    html = html.replace("<!--SEO:LD-->", `<!--SEO:LD-->\n  ${renderLd(head.jsonLd)}`);
  }
  return html;
};

// Resolve the dynamic data a path needs before building its <head>.
const resolvePath = async (reqPath) => {
  const vehicleMatch = reqPath.match(/^\/vehicles\/([^/]+)$/);
  if (vehicleMatch) {
    const [vehicle, modelImages] = await Promise.all([
      prisma.vehicle.findUnique({
        where: { id: vehicleMatch[1] },
        include: { images: { orderBy: { createdAt: "asc" }, take: 1 } },
      }),
      loadModelImageMap(),
    ]);
    // Mirror the SPA's getVehicleById so a bot and a browser never see
    // different pages for the same URL: out-of-service still renders, but a
    // sold vehicle is retired from the fleet and 404s on both.
    if (!vehicle || vehicle.soldAt) return { path: reqPath, vehicleMissing: true };
    const image =
      modelImages.get(modelImageKey(vehicle.brand, vehicle.model))?.blobUrl ||
      vehicle.images[0]?.blobUrl ||
      null;
    const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
    const brand = clean(vehicle.brand);
    const model = clean(vehicle.model);
    return {
      path: reqPath,
      vehicle: {
        name: `${brand} ${model}`.trim(),
        brand,
        model,
        image,
        transmission: vehicle.transmission,
        fuelType: vehicle.fuelType,
        modelYear: vehicle.modelYear,
        color: vehicle.color,
      },
    };
  }

  const locationMatch = reqPath.match(/^\/lokasyonlar\/([^/]+)$/);
  if (locationMatch) {
    const slug = locationMatch[1];
    const locations = await prisma.location.findMany({ select: { name: true } });
    const match = locations.find((l) => slugify(l.name) === slug);
    if (!match) return { path: reqPath, locationMissing: true };
    return { path: reqPath, locationName: match.name };
  }

  return { path: reqPath };
};

const renderPage = async (req, res) => {
  // "/" stays "/"; everything else loses its trailing slash.
  const reqPath = req.path === "/" ? "/" : req.path.replace(/\/+$/, "");

  try {
    const [shell, data] = await Promise.all([getShell(), resolvePath(reqPath)]);
    const head = buildHead(data);
    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).send(inject(shell, head));
  } catch (err) {
    // Never fail a crawler. Try once more for the plain shell; if even that is
    // unavailable, hand back a minimal but valid document with the right head.
    console.error("prerender failed:", err.message);
    res.set("Content-Type", "text/html; charset=utf-8");
    try {
      return res.status(200).send(await getShell());
    } catch {
      const head = buildHead({ path: reqPath });
      return res
        .status(200)
        .send(
          `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8" />\n` +
            `<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n` +
            `${renderHeadTags(head)}\n</head><body><div id="root"></div>` +
            `<p><a href="${SITE_URL}${reqPath}">Rentwin</a></p></body></html>`
        );
    }
  }
};

module.exports = { renderPage };
