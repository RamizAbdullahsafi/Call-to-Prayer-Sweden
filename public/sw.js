/* Service worker — PWA install + offline azan audio (keep list in sync with public/audio + src/azan.ts). */
const CACHE_AUDIO = "ctp-azan-audio-v1";

/** Bundled recitation files — must match `public/audio/` for offline playback in the browser. */
const AUDIO_PATHS = [
  "/audio/aaqib_azeez.mp3",
  "/audio/adhan_classic.ogg",
  "/audio/ahmad_nafees.mp3",
  "/audio/beautiful_adhan.ogg",
  "/audio/islamic_call_worship.oga",
  "/audio/karl_jenkins.mp3",
  "/audio/mansour_zahrani.mp3",
  "/audio/mishary_alt.mp3",
  "/audio/mishary_dubai.mp3",
  "/audio/mishary_yet_another.mp3",
  "/audio/mustafa_ozcan.mp3",
  "/audio/sabah_fakhry.mp3",
];

self.addEventListener("install", (event) => {
  const root = self.location.origin;
  event.waitUntil(
    caches.open(CACHE_AUDIO).then(async (cache) => {
      await Promise.allSettled(
        AUDIO_PATHS.map((path) =>
          cache.add(new Request(root + path, { cache: "reload" })).catch(() => {})
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/audio/")) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            void caches
              .open(CACHE_AUDIO)
              .then((cache) => cache.put(event.request, copy));
          }
          return res;
        });
      })
    );
    return;
  }
  event.respondWith(fetch(event.request));
});
