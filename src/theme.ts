export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "ctp.theme";

export function getStoredThemePreference(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* ignore */
  }
  return "system";
}

export function saveThemePreference(pref: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* ignore */
  }
}

export function effectiveTheme(pref: ThemePreference): "light" | "dark" {
  if (pref === "light" || pref === "dark") return pref;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyEffectiveTheme(effective: "light" | "dark"): void {
  document.documentElement.setAttribute("data-theme", effective);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute(
      "content",
      effective === "dark" ? "#0c1929" : "#e8f2ff"
    );
  }
}

/** Call once on startup (before paint if imported from main). */
export function initThemeFromStorage(): void {
  applyEffectiveTheme(effectiveTheme(getStoredThemePreference()));
}

export function subscribeSystemColorScheme(
  onChange: () => void
): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
