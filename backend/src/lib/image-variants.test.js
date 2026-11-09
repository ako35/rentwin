const test = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const { DISPLAY_WIDTHS, pickWidth, renderVariant } = require("./image-variants");

const png = (width, height) =>
  sharp({ create: { width, height, channels: 4, background: { r: 200, g: 200, b: 200, alpha: 0.5 } } })
    .png()
    .toBuffer();

test("only the fixed responsive widths are honoured", () => {
  for (const w of DISPLAY_WIDTHS) assert.equal(pickWidth(String(w)), w);
  for (const raw of [undefined, null, "", "0", "700", "640px", "-640", "1e3", "99999"]) {
    assert.equal(pickWidth(raw), null, `${raw} should fall back to the original`);
  }
});

test("a variant is a WebP capped at the requested width, keeping aspect ratio and alpha", async () => {
  const out = await renderVariant(await png(1600, 900), 640);
  const meta = await sharp(out).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 640);
  assert.equal(meta.height, 360);
  assert.equal(meta.hasAlpha, true);
});

test("a variant never upscales a smaller original", async () => {
  const meta = await sharp(await renderVariant(await png(677, 369), 960)).metadata();
  assert.equal(meta.width, 677);
  assert.equal(meta.height, 369);
});
