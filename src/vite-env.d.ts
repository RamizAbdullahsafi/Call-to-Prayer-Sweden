/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_ORIGIN?: string;
  /** Optional override for the Play Store listing URL (defaults to app id se.calltoprayer.sweden). */
  readonly VITE_PLAY_STORE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
