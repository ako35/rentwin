// Resized WebP variants of the public images served by /files/display/:id.
// The uploads are the originals (often 200 KB–2.5 MB PNGs), which made the
// public pages slow on mobile; a `?w=` request gets a width-capped WebP
// instead. Only a fixed set of widths is honoured so the CDN keeps a handful
// of variants per image rather than one per arbitrary number.
const sharp = require("sharp");

const DISPLAY_WIDTHS = [160, 320, 480, 640, 800, 960, 1280, 1600];

// "640" -> 640; anything outside DISPLAY_WIDTHS (or missing) -> null, which
// the caller treats as "serve the original".
const pickWidth = (raw) => {
  if (raw == null || raw === "") return null;
  const width = Number(raw);
  return DISPLAY_WIDTHS.includes(width) ? width : null;
};

// Never upscales: a 677px original asked for at 960 stays 677px wide.
const renderVariant = (input, width) =>
  sharp(input)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();

module.exports = { DISPLAY_WIDTHS, pickWidth, renderVariant };
