import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const bonetiderTarget = "https://www.islamiskaforbundet.se";
const bonetiderPath = "/wp-content/plugins/bonetider/Bonetider_Widget.php";

const bonetiderProxy = {
  target: bonetiderTarget,
  changeOrigin: true,
  rewrite: () => bonetiderPath,
};

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/bonetider": bonetiderProxy,
    },
  },
  preview: {
    proxy: {
      "/api/bonetider": bonetiderProxy,
    },
  },
});
