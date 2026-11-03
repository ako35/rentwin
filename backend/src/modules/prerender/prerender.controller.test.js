const test = require("node:test");
const assert = require("node:assert/strict");
const { renderPage } = require("./prerender.controller");

test("prerender failures return 503 instead of an empty page with 200", async (t) => {
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });
  global.fetch = async () => {
    throw new Error("shell unavailable");
  };

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
});
