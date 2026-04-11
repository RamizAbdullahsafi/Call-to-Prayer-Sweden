import { Capacitor } from "@capacitor/core";
import { useCallback, useEffect, useState } from "react";
import type { MessageId } from "./i18n/messages";

/** Chromium `beforeinstallprompt` (not in older DOM typings). */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "ctp.appBanner.dismissed";
const FALLBACK_MS = 2500;

function isStandalone(): boolean {
  if (typeof window.matchMedia === "function") {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
  }
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

/** iOS / iPadOS Safari: no `beforeinstallprompt`; user adds via Share → Add to Home Screen. */
function isIOSLike(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function AppDownloadBanner({
  t,
}: {
  t: (id: MessageId, vars?: Record<string, string | number>) => string;
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(
    null
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    if (Capacitor.isNativePlatform()) return;
    if (isStandalone()) return;

    if (isIOSLike()) {
      setVisible(true);
      return;
    }

    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const clearFallback = () => {
      if (fallbackTimer !== undefined) {
        clearTimeout(fallbackTimer);
        fallbackTimer = undefined;
      }
    };

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      clearFallback();
      cancelled = true;
      setDeferredPrompt(e as InstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    fallbackTimer = setTimeout(() => {
      if (!cancelled) setVisible(true);
    }, FALLBACK_MS);

    const onInstalled = () => setVisible(false);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      clearFallback();
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  if (!visible) return null;

  const showIosText = isIOSLike() && !deferredPrompt;
  const showInstallButton = Boolean(deferredPrompt);

  return (
    <div
      className="app-download-banner"
      role="region"
      aria-label={t("appDownloadBannerTitle")}
    >
      <div className="app-download-banner__inner">
        <div className="app-download-banner__mark" aria-hidden>
          <svg
            className="app-download-banner__mark-svg"
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
          >
            <rect
              width="40"
              height="40"
              rx="11"
              fill="currentColor"
              opacity="0.12"
            />
            <path
              d="M20 11v18M11 20h18"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="app-download-banner__text">
          <strong className="app-download-banner__title">
            {t("appDownloadBannerTitle")}
          </strong>
          <p className="app-download-banner__body">
            {showIosText
              ? t("appDownloadBannerIosBody")
              : t("appDownloadBannerBody")}
          </p>
        </div>
        <div className="app-download-banner__actions">
          {showInstallButton ? (
            <button
              type="button"
              className="app-download-banner__cta"
              onClick={() => void handleInstall()}
            >
              {t("appDownloadBannerInstall")}
            </button>
          ) : null}
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
