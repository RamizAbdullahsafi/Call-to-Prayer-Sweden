/** Single balanced appearance (no day/night toggle). */
const THEME_COLOR = "#e5efe9";

/** Sets meta tags for status bar / PWA chrome; CSS defines the actual palette. */
export function applyAppTheme(): void {
  document.documentElement.removeAttribute("data-theme");
  try {
    localStorage.removeItem("ctp.theme");
  } catch {
    /* ignore */
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", THEME_COLOR);
  }
  let schemeMeta = document.querySelector('meta[name="color-scheme"]');
  if (!schemeMeta) {
    schemeMeta = document.createElement("meta");
    schemeMeta.setAttribute("name", "color-scheme");
    document.head.appendChild(schemeMeta);
  }
  schemeMeta.setAttribute("content", "light");
}

/** Call once on startup (before paint if imported from main). */
export function initAppTheme(): void {
  applyAppTheme();
}
