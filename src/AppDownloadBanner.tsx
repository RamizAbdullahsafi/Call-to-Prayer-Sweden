import { Capacitor } from "@capacitor/core";
import { useEffect, useState } from "react";
import type { MessageId } from "./i18n/messages";

const DISMISS_KEY = "ctp.appBanner.dismissed";

function playStoreHref(): string {
  const fromEnv = import.meta.env.VITE_PLAY_STORE_URL?.trim();
  if (fromEnv) return fromEnv;
  return "https://play.google.com/store/apps/details?id=se.calltoprayer.sweden";
}

export function AppDownloadBanner({
  t,
}: {
  t: (id: MessageId, vars?: Record<string, string | number>) => string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    if (Capacitor.isNativePlatform()) return;
    if (typeof window.matchMedia === "function") {
      if (window.matchMedia("(display-mode: standalone)").matches) return;
    }
    const nav = window.navigator as Navigator & { standalone?: boolean };
    if (nav.standalone === true) return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <div
      className="app-download-banner"
      role="region"
      aria-label={t("appDownloadBannerTitle")}
    >
      <div className="app-download-banner__inner">
        <div className="app-download-banner__text">
          <strong className="app-download-banner__title">
            {t("appDownloadBannerTitle")}
          </strong>
          <p className="app-download-banner__body">
            {t("appDownloadBannerBody")}
          </p>
        </div>
        <div className="app-download-banner__actions">
          <a
            className="app-download-banner__cta"
            href={playStoreHref()}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("appDownloadBannerCta")}
          </a>
          <button
            type="button"
            className="app-download-banner__dismiss"
            onClick={dismiss}
          >
            {t("appDownloadBannerDismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
