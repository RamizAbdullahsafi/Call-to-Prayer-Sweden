import { Capacitor } from "@capacitor/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import { App } from "./App";
import { I18nProvider } from "./i18n";
import { initAppTheme } from "./theme";
import { ErrorBoundary } from "./ErrorBoundary";
import { initNativeChrome } from "./nativeChrome";

initAppTheme();

if ("serviceWorker" in navigator && !Capacitor.isNativePlatform()) {
  window.addEventListener("load", () => {
    const base = import.meta.env.BASE_URL ?? "/";
    const scope = base.endsWith("/") ? base : `${base}/`;
    const swUrl = new URL("sw.js", new URL(scope, self.location.origin)).href;
    void navigator.serviceWorker.register(swUrl, { scope });
  });
}

const root = document.querySelector<HTMLDivElement>("#app");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <I18nProvider>
          <App />
        </I18nProvider>
      </ErrorBoundary>
    </StrictMode>
  );
  void initNativeChrome();
}
