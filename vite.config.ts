import { defineConfig } from "vite";

const bonetiderTarget = "https://www.islamiskaforbundet.se";
const bonetiderPath = "/wp-content/plugins/bonetider/Bonetider_Widget.php";

const bonetiderProxy = {
  target: bonetiderTarget,
  changeOrigin: true,
  rewrite: () => bonetiderPath,
};

export default defineConfig({
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
