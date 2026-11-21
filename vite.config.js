import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        // Bootstrap 5 is themed by @import-ing it after our variable overrides
        // (styles.scss), the pattern its docs prescribe — it does not support
        // @use with configuration until Bootstrap 6. That @import, and
        // Bootstrap's own internals, print ~330 Dart Sass deprecation warnings
        // on every build, burying anything real. Silence exactly those: the
        // `import` deprecation, and every warning raised inside dependencies.
        // Deprecations in our own files outside @import still show up.
        silenceDeprecations: ["import"],
        quietDeps: true,
      },
    },
  },
});
