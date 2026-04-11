export type ThemePreference = "light" | "dark";

const STORAGE_KEY = "ctp.theme";

export function getStoredThemePreference(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "system") {
      localStorage.setItem(STORAGE_KEY, "dark");
      return "dark";
    }
    if (v === "light" || v === "dark") return v;
  } catch {
    /* ignore */
  }
  return "dark";
}

export function saveThemePreference(pref: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* ignore */
  }
}

export function applyEffectiveTheme(effective: "light" | "dark"): void {
  document.documentElement.setAttribute("data-theme", effective);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute(
      "content",
      effective === "dark" ? "#000000" : "#f5f5f7"
    );
  }
  /** Helps native form controls follow dark/light in supporting browsers. */
  let schemeMeta = document.querySelector('meta[name="color-scheme"]');
  if (!schemeMeta) {
    schemeMeta = document.createElement("meta");
    schemeMeta.setAttribute("name", "color-scheme");
    document.head.appendChild(schemeMeta);
  }
  schemeMeta.setAttribute(
    "content",
    effective === "dark" ? "dark" : "light"
  );
}

/** Call once on startup (before paint if imported from main). */
export function initThemeFromStorage(): void {
  applyEffectiveTheme(getStoredThemePreference());
}
