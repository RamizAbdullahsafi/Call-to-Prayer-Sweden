import { Capacitor } from "@capacitor/core";

/**
 * Status bar + splash handoff after the WebView has painted (Android / iOS).
 * Keeps launch feeling fast without a long blank or mismatched chrome.
 */
export async function initNativeChrome(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const [{ SplashScreen }, { StatusBar, Style }] = await Promise.all([
    import("@capacitor/splash-screen"),
    import("@capacitor/status-bar"),
  ]);

  try {
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: "#e5efe9" });
  } catch {
    /* older WebViews / permission quirks */
  }

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  try {
    await SplashScreen.hide({ fadeOutDuration: 280 });
  } catch {
    /* ignore */
  }
}
