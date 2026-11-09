const API_URL = import.meta.env.VITE_APP_API_URL;

// Public images are served by /files/display/:id. With `?w=` the backend
// answers with a width-capped WebP (backend/src/lib/image-variants.js); the
// widths below must stay within its DISPLAY_WIDTHS or it serves the original.
export const imageUrl = (id, width) => `${API_URL}/files/display/${id}${width ? `?w=${width}` : ""}`;

export const imageSrcSet = (id, widths) => widths.map((w) => `${imageUrl(id, w)} ${w}w`).join(", ");

// Ready-made <img> props: `src` is the fallback width, `srcSet`/`sizes` let the
// browser pick the smallest variant that fills the slot on this screen.
export const responsiveImage = (id, { widths, fallback, sizes }) => ({
  src: imageUrl(id, fallback),
  srcSet: imageSrcSet(id, widths),
  sizes,
});
