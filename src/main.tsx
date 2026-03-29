import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import { App } from "./App";
import { I18nProvider } from "./i18n";
import { initThemeFromStorage } from "./theme";

initThemeFromStorage();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js", { scope: "/" });
  });
}

const root = document.querySelector<HTMLDivElement>("#app");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <I18nProvider>
        <App />
      </I18nProvider>
    </StrictMode>
  );
}
