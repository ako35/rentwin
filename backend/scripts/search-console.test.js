const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const jwt = require("jsonwebtoken");
const {
  run,
  pickSite,
  parseSitemapLocs,
  dateRange,
  CliError,
  TOKEN_URL,
  SCOPE_READ,
  SCOPE_WRITE,
} = require("./search-console");
const { SITE_URL } = require("../src/lib/site");

const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const CLIENT_EMAIL = "gsc-reader@rentwin-seo.iam.gserviceaccount.com";
const keyDir = fs.mkdtempSync(path.join(os.tmpdir(), "gsc-test-"));
const keyFile = path.join(keyDir, "key.json");
fs.writeFileSync(
  keyFile,
  JSON.stringify({ type: "service_account", client_email: CLIENT_EMAIL, private_key: privateKey, private_key_id: "kid1" })
);
test.after(() => fs.rmSync(keyDir, { recursive: true, force: true }));

const SITE = "sc-domain:rentwin.com.tr";
const json = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => (body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body)),
});

// A fake Google: verifies the JWT assertion against the generated key, then
// routes by URL. `handlers` can override any route.
const fakeGoogle = (handlers = {}) => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, method: init.method || "GET", body: init.body, headers: init.headers || {} });
    if (url === TOKEN_URL) {
      const params = new URLSearchParams(init.body);
      const claims = jwt.verify(params.get("assertion"), publicKey, { algorithms: ["RS256"], audience: TOKEN_URL });
      assert.equal(claims.iss, CLIENT_EMAIL);
      calls.at(-1).scope = claims.scope;
      return json(200, { access_token: "test-token", expires_in: 3600 });
    }
    if (url.includes("googleapis.com")) {
      assert.equal(init.headers?.authorization, "Bearer test-token", `unauthenticated call to ${url}`);
    } else {
      assert.equal(init.headers?.authorization, undefined, `token leaked to ${url}`);
    }
    for (const [pattern, handler] of Object.entries(handlers)) {
      if (url.includes(pattern)) return handler(url, init);
    }
    if (url.endsWith("/webmasters/v3/sites")) {
      return json(200, { siteEntry: [{ siteUrl: SITE, permissionLevel: "siteFullUser" }] });
    }
    throw new Error(`unexpected fetch ${init.method || "GET"} ${url}`);
  };
  return { fetchImpl, calls };
};

const runCli = async (argv, fake, env = {}) => {
  const lines = [];
  await run(argv, { env: { GSC_CREDENTIALS: keyFile, ...env }, fetchImpl: fake.fetchImpl, log: (l) => lines.push(l) });
  return lines.join("\n");
};

test("pickSite prefers the domain property, then an https URL-prefix one", () => {
  assert.equal(
    pickSite([
      { siteUrl: "https://rentwin.com.tr/", permissionLevel: "siteOwner" },
      { siteUrl: "sc-domain:rentwin.com.tr", permissionLevel: "siteRestrictedUser" },
    ]),
    "sc-domain:rentwin.com.tr"
  );
  assert.equal(
    pickSite([
      { siteUrl: "http://www.rentwin.com.tr/", permissionLevel: "siteFullUser" },
      { siteUrl: "https://rentwin.com.tr/", permissionLevel: "siteFullUser" },
      { siteUrl: "sc-domain:other.com", permissionLevel: "siteOwner" },
    ]),
    "https://rentwin.com.tr/"
  );
  assert.equal(pickSite([{ siteUrl: "sc-domain:rentwin.com.tr", permissionLevel: "siteUnverifiedUser" }]), null);
});

test("parseSitemapLocs reads page URLs and skips image:loc entries", () => {
  const xml = `<urlset><url><loc>https://rentwin.com.tr/</loc>
    <image:image><image:loc>https://cdn.example/a.jpg</image:loc></image:image></url>
    <url><loc> https://rentwin.com.tr/blog/a?x=1&amp;y=2 </loc></url></urlset>`;
  assert.deepEqual(parseSitemapLocs(xml), ["https://rentwin.com.tr/", "https://rentwin.com.tr/blog/a?x=1&y=2"]);
});

test("dateRange ends 3 days back and the previous window sits right before it", () => {
  const { current, previous } = dateRange(28, new Date("2026-11-08T10:00:00Z"));
  assert.deepEqual(current, { startDate: "2026-10-09", endDate: "2026-11-05" });
  assert.deepEqual(previous, { startDate: "2026-09-11", endDate: "2026-10-08" });
});

test("sites prints the service account email so it can be added in Search Console", async () => {
  const fake = fakeGoogle({ "/webmasters/v3/sites": () => json(200, {}) });
  const out = await runCli(["sites"], fake);
  assert.match(out, new RegExp(CLIENT_EMAIL.replace(/\./g, "\\.")));
  assert.match(out, /No properties shared/);
  assert.equal(fake.calls[0].scope, SCOPE_READ);
});

test("inspect with no URLs checks every sitemap URL and flags problems", async () => {
  const fake = fakeGoogle({
    "/sitemap.xml": () =>
      json(
        200,
        `<urlset><url><loc>${SITE_URL}/</loc></url><url><loc>${SITE_URL}/lokasyonlar/aliaga</loc></url>` +
          `<url><loc>${SITE_URL}/vehicles/abc</loc></url></urlset>`
      ),
    "urlInspection/index:inspect": (url, init) => {
      const { inspectionUrl, siteUrl } = JSON.parse(init.body);
      assert.equal(siteUrl, SITE);
      const byUrl = {
        [`${SITE_URL}/`]: { verdict: "PASS", coverageState: "Submitted and indexed", userCanonical: `${SITE_URL}/`, googleCanonical: `${SITE_URL}/`, lastCrawlTime: "2026-11-01T08:00:00Z" },
        [`${SITE_URL}/lokasyonlar/aliaga`]: { verdict: "NEUTRAL", coverageState: "Crawled - currently not indexed" },
        [`${SITE_URL}/vehicles/abc`]: { verdict: "PASS", coverageState: "Submitted and indexed", userCanonical: `${SITE_URL}/vehicles/abc`, googleCanonical: `${SITE_URL}/vehicles/xyz` },
      };
      return json(200, { inspectionResult: { indexStatusResult: byUrl[inspectionUrl] } });
    },
  });
  const out = await runCli(["inspect"], fake);
  assert.match(out, /Indexed: 2\/3/);
  assert.match(out, /Not indexed:\n {2}\/lokasyonlar\/aliaga — Crawled - currently not indexed/);
  assert.match(out, /Google chose a different canonical:\n {2}\/vehicles\/abc/);
  assert.match(out, /google: {3}https:\/\/rentwin\.com\.tr\/vehicles\/xyz/);
  assert.equal(fake.calls.filter((c) => c.url.includes("index:inspect")).length, 3);
});

test("inspect --json returns structured results for explicit URLs", async () => {
  const fake = fakeGoogle({
    "urlInspection/index:inspect": () =>
      json(200, { inspectionResult: { indexStatusResult: { verdict: "PASS", coverageState: "Submitted and indexed" } } }),
  });
  const data = JSON.parse(await runCli(["inspect", `${SITE_URL}/blog/x`, "--json"], fake));
  assert.equal(data.site, SITE);
  assert.equal(data.summary.indexed, 1);
  assert.equal(data.results[0].url, `${SITE_URL}/blog/x`);
  assert.ok(!fake.calls.some((c) => c.url.endsWith("/sitemap.xml")));
});

test("performance compares totals with the previous period and lists top queries/pages", async () => {
  const fake = fakeGoogle({
    "/searchAnalytics/query": (url, init) => {
      const body = JSON.parse(init.body);
      assert.ok(url.includes(encodeURIComponent(SITE)));
      if (!body.dimensions) {
        const current = body.startDate === dateRange(28).current.startDate;
        return json(200, {
          rows: [current ? { clicks: 120, impressions: 4000, ctr: 0.03, position: 12.4 } : { clicks: 100, impressions: 3000, ctr: 0.0333, position: 14.1 }],
        });
      }
      assert.equal(body.rowLimit, 5);
      if (body.dimensions[0] === "query") {
        return json(200, { rows: [{ keys: ["aliağa araç kiralama"], clicks: 40, impressions: 900, ctr: 0.044, position: 6.2 }] });
      }
      return json(200, { rows: [{ keys: [`${SITE_URL}/lokasyonlar/aliaga`], clicks: 25, impressions: 500, ctr: 0.05, position: 7.9 }] });
    },
  });
  const out = await runCli(["performance", "--limit", "5"], fake);
  assert.match(out, /Clicks\s+120\s+100\s+\+20%/);
  assert.match(out, /Avg\. position\s+12\.4\s+14\.1\s+-1\.7/);
  assert.match(out, /aliağa araç kiralama\s+40/);
  assert.match(out, /\/lokasyonlar\/aliaga\s+25/);
});

test("sitemaps submit asks for the write scope and PUTs the encoded feed URL", async () => {
  const fake = fakeGoogle({ "/sitemaps/": () => json(204) });
  const out = await runCli(["sitemaps", "submit"], fake);
  assert.equal(fake.calls[0].scope, SCOPE_WRITE);
  const put = fake.calls.find((c) => c.method === "PUT");
  assert.ok(put.url.endsWith(`/sitemaps/${encodeURIComponent(`${SITE_URL}/sitemap.xml`)}`));
  assert.match(out, /Submitted/);
});

test("a 403 from Google explains how to share the property", async () => {
  const fake = fakeGoogle({
    "/sitemaps": () => json(403, { error: { code: 403, message: "User does not have sufficient permission for site" } }),
  });
  await assert.rejects(runCli(["sitemaps"], fake, { GSC_SITE_URL: SITE }), (err) => {
    assert.ok(err instanceof CliError);
    assert.match(err.message, /sufficient permission/);
    assert.match(err.message, /Users and permissions/);
    return true;
  });
});

test("a missing key file fails before any network call", async () => {
  const fake = fakeGoogle();
  await assert.rejects(
    run(["sites"], { env: { GSC_CREDENTIALS: path.join(keyDir, "nope.json") }, fetchImpl: fake.fetchImpl, log: () => {} }),
    /Service account key not found/
  );
  assert.equal(fake.calls.length, 0);
});

test("bad flags and unknown commands are rejected up front", async () => {
  const fake = fakeGoogle();
  await assert.rejects(runCli(["performance", "--days", "0"], fake), /--days must be/);
  await assert.rejects(runCli(["reindex"], fake), /Unknown command: reindex/);
  assert.equal(fake.calls.length, 0);
});

test("a sitemap network failure explains itself instead of crashing", async () => {
  const fake = fakeGoogle({
    "/sitemap.xml": () => {
      throw Object.assign(new TypeError("fetch failed"), { cause: new Error("redirect count exceeded") });
    },
  });
  await assert.rejects(runCli(["inspect"], fake), (err) => {
    assert.ok(err instanceof CliError);
    assert.match(err.message, /redirect count exceeded/);
    assert.match(err.message, /redirect loop/);
    return true;
  });
});
