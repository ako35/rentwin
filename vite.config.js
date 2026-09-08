import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Split the big third-party libs into their own long-cached chunks instead
    // of one ~900 KB bundle — better first-load parse time and cache hits.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/[\\/]react(?:-dom|-router[^\\/]*)?[\\/]/.test(id)) return "react-vendor";
          if (id.includes("react-bootstrap") || id.includes("@restart") || id.includes("react-icons"))
            return "ui-vendor";
          if (id.includes("bootstrap")) return "bootstrap-vendor";
          if (id.includes("redux") || id.includes("reselect")) return "redux-vendor";
          if (id.includes("sweetalert2")) return "swal-vendor";
          if (id.includes("i18next")) return "i18n-vendor";
          // moment is heavy and only the admin screens use it — keep it out of
          // the shared util chunk so public pages never pay for it.
          if (id.includes("moment")) return "moment-vendor";
          if (id.includes("formik") || id.includes("yup") || id.includes("axios"))
            return "util-vendor";
          return "vendor";
        },
      },
    },
  },
});
