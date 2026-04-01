/**
 * Enable with localStorage.setItem("ctp.debug", "1") or in dev (import.meta.env.DEV).
 * Logs prayer scheduling and notification events with prefix [CTP].
 */
export function isNotificationDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (import.meta.env.DEV) return true;
    return localStorage.getItem("ctp.debug") === "1";
  } catch {
    return false;
  }
}

export function logNotificationDebug(...args: unknown[]): void {
  if (!isNotificationDebugEnabled()) return;
  const ts = new Date().toISOString();
  console.log(`[CTP ${ts}]`, ...args);
}
