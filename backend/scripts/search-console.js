// Google Search Console from the command line — performance, URL index status
// and sitemaps for the public site, through the Search Console API.
//
// Auth is a Google Cloud service account that has been added as a user on the
// Search Console property. No googleapis dependency: the OAuth2 JWT-bearer
// assertion is signed with jsonwebtoken (already a backend dependency) and the
// REST endpoints are called with fetch.
//
// Setup (once):
//   1. Google Cloud console: enable "Google Search Console API", create a
//      service account (no IAM roles needed), add a JSON key to it.
//   2. Save the key OUTSIDE the repo — default ~/.rentwin/gsc-service-account.json,
//      or point GSC_CREDENTIALS at it.
//   3. Search Console → Settings → Users and permissions → Add user → the key's
//      client_email. "Restricted" is enough to read; `sitemaps submit` needs "Full".
//
// Usage (from backend/):
//   npm run gsc -- sites                     properties this account can see
//   npm run gsc -- performance [--days 28] [--limit 20]
//   npm run gsc -- inspect [url ...]         no URL = every URL in the live sitemap
//   npm run gsc -- sitemaps                  submitted sitemaps and their status
//   npm run gsc -- sitemaps submit [url]     (re)submit, default <site>/sitemap.xml
//   add --json to any command for machine-readable output
//
// GSC_SITE_URL pins the property ("sc-domain:rentwin.com.tr" or
// "https://rentwin.com.tr/"); otherwise it is picked from `sites` by host.
//
// Note: "Request indexing" has no public API for ordinary pages (Google's
// Indexing API is limited to JobPosting / livestream pages) — that one stays
// a manual click in the Search Console UI.

const fs = require("fs");
const os = require("os");
const path = require("path");
const jwt = require("jsonwebtoken");

try {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
} catch {
  /* dotenv is optional here — plain env vars still work */
}

const { SITE_URL } = require("../src/lib/site");

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const WEBMASTERS = "https://www.googleapis.com/webmasters/v3";
const INSPECT_URL = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
const SCOPE_READ = "https://www.googleapis.com/auth/webmasters.readonly";
const SCOPE_WRITE = "https://www.googleapis.com/auth/webmasters";
const DEFAULT_CREDENTIALS = path.join(os.homedir(), ".rentwin", "gsc-service-account.json");
// Search Console data settles ~2-3 days behind; querying up to "today" only
// adds a half-empty tail that drags every total down.
const DATA_LAG_DAYS = 3;
// URL Inspection allows 600 calls/min per property — 3 in flight stays well under.
const INSPECT_CONCURRENCY = 3;

const USAGE = `Usage: npm run gsc -- <command> [options]

  sites                      properties shared with the service account
  performance [--days 28] [--limit 20]
                             clicks / impressions / CTR / position vs the
                             previous period, plus top queries and pages
  inspect [url ...]          Google's index status per URL (default: every
                             URL in ${SITE_URL}/sitemap.xml)
  sitemaps                   submitted sitemaps and their status
  sitemaps submit [url]      (re)submit a sitemap (needs Full permission)

  --json                     raw JSON output
Env: GSC_CREDENTIALS (key path, default ${DEFAULT_CREDENTIALS}), GSC_SITE_URL`;

class CliError extends Error {}

/* ------------------------------------------------------------------ auth  */

const loadCredentials = (file) => {
  if (!fs.existsSync(file)) {
    throw new CliError(
      `Service account key not found: ${file}\n  Save the JSON key there or set GSC_CREDENTIALS to its path.`
    );
  }
  let creds;
  try {
    creds = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    throw new CliError(`Not valid JSON: ${file}`);
  }
  if (creds.type !== "service_account" || !creds.client_email || !creds.private_key) {
    throw new CliError(
      `${file} is not a service account key (expected type "service_account" with client_email and private_key).`
    );
  }
  return creds;
};

const getAccessToken = async (creds, scope, fetchImpl) => {
  const iat = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    { iss: creds.client_email, scope, aud: TOKEN_URL, iat, exp: iat + 3600 },
    creds.private_key,
    { algorithm: "RS256", ...(creds.private_key_id ? { keyid: creds.private_key_id } : {}) }
  );
  const res = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new CliError(
      `Google token request failed (${res.status}): ${body.error_description || body.error || "no access_token"}` +
        (res.status === 400 || res.status === 401
          ? "\n  The key may have been deleted or the service account disabled — create a new key."
          : "")
    );
  }
  return body.access_token;
};

/* ------------------------------------------------------------------- api  */

const hintFor = (status, message) => {
  if (/has not been used|is disabled|SERVICE_DISABLED/i.test(message)) {
    return 'Enable "Google Search Console API" in the key\'s Google Cloud project, wait a minute, retry.';
  }
  if (status === 403) {
    return "Add the service account's client_email as a user on the Search Console property " +
      "(Settings → Users and permissions). `sitemaps submit` needs Full permission.";
  }
  if (status === 429) return "Quota hit — wait a minute (URL Inspection: 600/min, 2000/day per property).";
  return null;
};

const createApi = (token, fetchImpl) => async (method, url, body) => {
  const res = await fetchImpl(url, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  if (!res.ok) {
    const message = data.error?.message || data.raw || `HTTP ${res.status}`;
    const hint = hintFor(res.status, message);
    throw new CliError(`${method} ${url} → ${res.status}: ${message}${hint ? `\n  ${hint}` : ""}`);
  }
  return data;
};

const siteBase = (site) => `${WEBMASTERS}/sites/${encodeURIComponent(site)}`;

/* ----------------------------------------------------------------- sites  */

const listSites = async (api) => (await api("GET", `${WEBMASTERS}/sites`)).siteEntry || [];

const bareHost = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

// Domain property first (it covers http/https/www), then an https URL-prefix
// property, then any other prefix property on the same host.
const pickSite = (sites, siteUrl = SITE_URL) => {
  const host = bareHost(siteUrl);
  const usable = sites.filter((s) => s.permissionLevel !== "siteUnverifiedUser");
  const domain = usable.find((s) => s.siteUrl === `sc-domain:${host}`);
  if (domain) return domain.siteUrl;
  const prefixes = usable
    .filter((s) => bareHost(s.siteUrl) === host)
    .sort((a, b) => Number(b.siteUrl.startsWith("https:")) - Number(a.siteUrl.startsWith("https:")));
  return prefixes[0]?.siteUrl || null;
};

const resolveSite = async (api, env) => {
  if (env.GSC_SITE_URL) return env.GSC_SITE_URL;
  const site = pickSite(await listSites(api));
  if (!site) {
    throw new CliError(
      `No Search Console property for ${SITE_URL} is shared with this service account.\n` +
        "  Add its client_email under Settings → Users and permissions (run `npm run gsc -- sites` to see it), or set GSC_SITE_URL."
    );
  }
  return site;
};

/* ----------------------------------------------------------- performance  */

const isoDate = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));

// Two back-to-back windows of `days` days, the newer one ending DATA_LAG_DAYS ago.
const dateRange = (days, now = new Date()) => {
  const end = addDays(now, -DATA_LAG_DAYS);
  const start = addDays(end, -(days - 1));
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(days - 1));
  return {
    current: { startDate: isoDate(start), endDate: isoDate(end) },
    previous: { startDate: isoDate(prevStart), endDate: isoDate(prevEnd) },
  };
};

const queryAnalytics = async (api, site, body) =>
  (await api("POST", `${siteBase(site)}/searchAnalytics/query`, body)).rows || [];

const performance = async (api, site, { days, limit }) => {
  const { current, previous } = dateRange(days);
  const [[totals], [previousTotals], queries, pages] = await Promise.all([
    queryAnalytics(api, site, current),
    queryAnalytics(api, site, previous),
    queryAnalytics(api, site, { ...current, dimensions: ["query"], rowLimit: limit }),
    queryAnalytics(api, site, { ...current, dimensions: ["page"], rowLimit: limit }),
  ]);
  return {
    site,
    days,
    current,
    previous,
    totals: totals || null,
    previousTotals: previousTotals || null,
    queries: queries.map((r) => ({ query: r.keys[0], ...metrics(r) })),
    pages: pages.map((r) => ({ page: r.keys[0], ...metrics(r) })),
  };
};

const metrics = ({ clicks = 0, impressions = 0, ctr = 0, position = 0 }) => ({ clicks, impressions, ctr, position });

/* --------------------------------------------------------------- inspect  */

const parseSitemapLocs = (xml) =>
  [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));

const fetchSitemapUrls = async (fetchImpl, sitemapUrl) => {
  let res;
  try {
    res = await fetchImpl(sitemapUrl, { headers: { "user-agent": "RentwinSearchConsoleCLI/1.0" } });
  } catch (err) {
    const reason = err.cause?.message || err.message;
    throw new CliError(
      `Could not fetch the live sitemap ${sitemapUrl}: ${reason}` +
        (/redirect/i.test(reason) ? "\n  The site itself is stuck in a redirect loop — fix that first (see `curl -I`)." : "") +
        "\n  You can still inspect specific URLs: npm run gsc -- inspect <url> [url ...]"
    );
  }
  if (!res.ok) throw new CliError(`Sitemap fetch failed: ${sitemapUrl} → ${res.status}`);
  return parseSitemapLocs(await res.text());
};

const inspectUrl = async (api, site, url) => {
  const data = await api("POST", INSPECT_URL, { inspectionUrl: url, siteUrl: site, languageCode: "en-US" });
  const r = data.inspectionResult?.indexStatusResult || {};
  return {
    url,
    verdict: r.verdict || "VERDICT_UNSPECIFIED",
    coverageState: r.coverageState || "",
    indexingState: r.indexingState || null,
    pageFetchState: r.pageFetchState || null,
    robotsTxtState: r.robotsTxtState || null,
    lastCrawlTime: r.lastCrawlTime || null,
    userCanonical: r.userCanonical || null,
    googleCanonical: r.googleCanonical || null,
  };
};

const mapPool = async (items, limit, fn) => {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
};

const summarizeInspections = (results) => ({
  total: results.length,
  indexed: results.filter((r) => r.verdict === "PASS").length,
  notIndexed: results.filter((r) => r.verdict !== "PASS"),
  // Google picked a different canonical than the one the page declares — the
  // signal that duplicate/near-duplicate pages are being folded together.
  canonicalMismatch: results.filter(
    (r) => r.userCanonical && r.googleCanonical && r.userCanonical !== r.googleCanonical
  ),
});

/* -------------------------------------------------------------- sitemaps  */

const listSitemaps = async (api, site) => (await api("GET", `${siteBase(site)}/sitemaps`)).sitemap || [];

const submitSitemap = (api, site, feed) => api("PUT", `${siteBase(site)}/sitemaps/${encodeURIComponent(feed)}`);

/* ------------------------------------------------------------- rendering  */

const shortUrl = (url) => (url && url.startsWith(SITE_URL) ? url.slice(SITE_URL.length) || "/" : url);
const clip = (s, n = 60) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const int = (v) => Math.round(v).toLocaleString("en-US");
const pct = (v) => `${(v * 100).toFixed(1)}%`;
const pos = (v) => v.toFixed(1);
const day = (iso) => (iso ? iso.slice(0, 10) : "—");

const table = (headers, rows) => {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const line = (cells) =>
    cells
      .map((c, i) => (i === 0 ? String(c).padEnd(widths[i]) : String(c).padStart(widths[i])))
      .join("  ")
      .trimEnd();
  return [line(headers), line(widths.map((w) => "-".repeat(w))), ...rows.map(line)].join("\n");
};

const relChange = (a, b) => (b ? `${a >= b ? "+" : ""}${(((a - b) / b) * 100).toFixed(0)}%` : "—");

const renderPerformance = (p) => {
  const t = p.totals || metrics({});
  const b = p.previousTotals || metrics({});
  const out = [
    `Property: ${p.site}`,
    `Period:   ${p.current.startDate} → ${p.current.endDate} (${p.days} days), vs ${p.previous.startDate} → ${p.previous.endDate}`,
    "",
    table(
      ["", "this period", "previous", "change"],
      [
        ["Clicks", int(t.clicks), int(b.clicks), relChange(t.clicks, b.clicks)],
        ["Impressions", int(t.impressions), int(b.impressions), relChange(t.impressions, b.impressions)],
        ["CTR", pct(t.ctr), pct(b.ctr), b.ctr ? `${((t.ctr - b.ctr) * 100).toFixed(1)} pt` : "—"],
        // Lower is better for position, so show the raw difference, not a %.
        ["Avg. position", pos(t.position), pos(b.position), b.position ? (t.position - b.position).toFixed(1) : "—"],
      ]
    ),
  ];
  if (!p.totals) out.push("", "No search data in this period yet.");
  for (const [title, rows, key, fmt] of [
    ["Top queries", p.queries, "query", (s) => s],
    ["Top pages", p.pages, "page", shortUrl],
  ]) {
    if (!rows.length) continue;
    out.push(
      "",
      title,
      table(
        [key, "clicks", "impr.", "CTR", "pos."],
        rows.map((r) => [clip(fmt(r[key])), int(r.clicks), int(r.impressions), pct(r.ctr), pos(r.position)])
      )
    );
  }
  return out.join("\n");
};

const renderInspections = ({ site, results }) => {
  const s = summarizeInspections(results);
  const out = [
    `Property: ${site}`,
    "",
    table(
      ["url", "verdict", "coverage", "last crawl"],
      results.map((r) => [clip(shortUrl(r.url), 50), r.verdict, clip(r.coverageState, 45), day(r.lastCrawlTime)])
    ),
    "",
    `Indexed: ${s.indexed}/${s.total}`,
  ];
  if (s.notIndexed.length) {
    out.push("", "Not indexed:");
    for (const r of s.notIndexed) out.push(`  ${shortUrl(r.url)} — ${r.coverageState || r.verdict}`);
  }
  if (s.canonicalMismatch.length) {
    out.push("", "Google chose a different canonical:");
    for (const r of s.canonicalMismatch) {
      out.push(`  ${shortUrl(r.url)}`, `    declared: ${r.userCanonical}`, `    google:   ${r.googleCanonical}`);
    }
  }
  return out.join("\n");
};

const renderSitemaps = ({ site, sitemaps }) => {
  if (!sitemaps.length) return `Property: ${site}\n\nNo sitemaps submitted. Run: npm run gsc -- sitemaps submit`;
  const out = [`Property: ${site}`];
  for (const sm of sitemaps) {
    const submitted = (sm.contents || []).map((c) => `${c.type}: ${c.submitted} submitted`).join(", ");
    out.push(
      "",
      sm.path,
      `  last submitted ${day(sm.lastSubmitted)}, last read by Google ${day(sm.lastDownloaded)}` +
        `${sm.isPending ? " (pending)" : ""}`,
      `  errors ${sm.errors || 0}, warnings ${sm.warnings || 0}${submitted ? ` — ${submitted}` : ""}`
    );
  }
  return out.join("\n");
};

const renderSites = (email) => (sites) => {
  const out = [`Service account: ${email}`, ""];
  if (!sites.length) {
    out.push(
      "No properties shared with this account yet.",
      "Search Console → Settings → Users and permissions → Add user → the email above."
    );
  } else {
    out.push(table(["property", "permission"], sites.map((s) => [s.siteUrl, s.permissionLevel])));
  }
  return out.join("\n");
};

/* ------------------------------------------------------------------- cli  */

const VALUE_FLAGS = new Set(["days", "limit"]);

const parseArgs = (argv) => {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const [key, inline] = arg.slice(2).split("=");
    if (inline !== undefined) flags[key] = inline;
    else if (VALUE_FLAGS.has(key) && argv[i + 1] !== undefined) flags[key] = argv[++i];
    else flags[key] = true;
  }
  return { positional, flags };
};

const intFlag = (flags, name, fallback, min, max) => {
  if (flags[name] === undefined) return fallback;
  const n = Number(flags[name]);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new CliError(`--${name} must be a whole number between ${min} and ${max}`);
  }
  return n;
};

const run = async (argv, { env = process.env, fetchImpl = fetch, log = console.log } = {}) => {
  const {
    positional: [command, ...rest],
    flags,
  } = parseArgs(argv);
  if (!command || command === "help" || flags.help) {
    log(USAGE);
    return;
  }
  if (!["sites", "performance", "inspect", "sitemaps"].includes(command)) {
    throw new CliError(`Unknown command: ${command}\n\n${USAGE}`);
  }
  const submitting = command === "sitemaps" && rest[0] === "submit";
  // Validate flags before any network call.
  const days = intFlag(flags, "days", 28, 1, 480);
  const limit = intFlag(flags, "limit", 20, 1, 1000);

  const creds = loadCredentials(env.GSC_CREDENTIALS || DEFAULT_CREDENTIALS);
  const token = await getAccessToken(creds, submitting ? SCOPE_WRITE : SCOPE_READ, fetchImpl);
  const api = createApi(token, fetchImpl);
  const out = (data, render) => log(flags.json ? JSON.stringify(data, null, 2) : render(data));

  if (command === "sites") {
    out(await listSites(api), renderSites(creds.client_email));
    return;
  }

  const site = await resolveSite(api, env);

  if (command === "performance") {
    out(await performance(api, site, { days, limit }), renderPerformance);
    return;
  }

  if (command === "inspect") {
    const urls = rest.length ? rest : await fetchSitemapUrls(fetchImpl, `${SITE_URL}/sitemap.xml`);
    if (!urls.length) throw new CliError("No URLs to inspect.");
    const results = await mapPool(urls, INSPECT_CONCURRENCY, (url) => inspectUrl(api, site, url));
    out({ site, results, summary: summarizeInspections(results) }, renderInspections);
    return;
  }

  // sitemaps
  if (submitting) {
    const feed = rest[1] || `${SITE_URL}/sitemap.xml`;
    await submitSitemap(api, site, feed);
    log(`Submitted ${feed} to ${site}.`);
    return;
  }
  if (rest.length) throw new CliError(`Unknown sitemaps subcommand: ${rest[0]}\n\n${USAGE}`);
  out({ site, sitemaps: await listSitemaps(api, site) }, renderSitemaps);
};

if (require.main === module) {
  run(process.argv.slice(2)).catch((err) => {
    console.error(err instanceof CliError ? `✖ ${err.message}` : err);
    process.exitCode = 1;
  });
}

module.exports = {
  run,
  pickSite,
  parseSitemapLocs,
  dateRange,
  summarizeInspections,
  CliError,
  TOKEN_URL,
  SCOPE_READ,
  SCOPE_WRITE,
};
