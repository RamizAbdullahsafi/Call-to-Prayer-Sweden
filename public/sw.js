/* Service worker — PWA + offline azan. Keep AUDIO_PATHS in sync with every file in public/audio/ (see src/azan.ts offlineFile names). */
const CACHE_AUDIO = "ctp-azan-audio-v2";

/** Pre-cache all bundled azan assets so /audio/* works offline without a prior visit. */
const AUDIO_PATHS = [
  "/audio/aaqib_azeez.mp3",
  "/audio/adhan_classic.ogg",
  "/audio/ahmad_nafees.mp3",
  "/audio/beautiful_adhan.ogg",
  "/audio/islamic_call_worship.oga",
  "/audio/karl_jenkins.mp3",
  "/audio/mansour_zahrani.mp3",
  "/audio/masjid_al_haram.webm",
  "/audio/mishary_alt.mp3",
  "/audio/mishary_dubai.mp3",
  "/audio/mishary_sc_01_160922833.m4a",
  "/audio/mishary_sc_02_160923210.m4a",
  "/audio/mishary_sc_03_160922604.m4a",
  "/audio/mishary_sc_04_160922603.m4a",
  "/audio/mishary_sc_05_160922602.m4a",
  "/audio/mishary_sc_06_160922601.m4a",
  "/audio/mishary_sc_07_160922600.m4a",
  "/audio/mishary_sc_08_160921786.m4a",
  "/audio/mishary_sc_09_160921785.m4a",
  "/audio/mishary_sc_10_160921783.m4a",
  "/audio/mishary_sc_11_160921782.m4a",
  "/audio/mishary_sc_12_160921781.m4a",
  "/audio/mishary_sc_13_160921108.m4a",
  "/audio/mishary_sc_14_160921107.m4a",
  "/audio/mishary_sc_15_160919244.m4a",
  "/audio/mishary_sc_16_160919243.m4a",
  "/audio/mishary_sc_17_160919242.m4a",
  "/audio/mishary_sc_18_160919241.m4a",
  "/audio/mishary_sc_19_160919240.m4a",
  "/audio/mishary_sc_20_160919239.m4a",
  "/audio/mishary_sc_21_160919238.m4a",
  "/audio/mishary_sc_22_160919237.m4a",
  "/audio/mishary_sc_23_160919236.m4a",
  "/audio/mishary_sc_24_160919235.m4a",
  "/audio/mishary_sc_25_160919234.m4a",
  "/audio/mishary_sc_26_160919233.m4a",
  "/audio/mishary_sc_27_160919232.m4a",
  "/audio/mishary_yet_another.mp3",
  "/audio/mustafa_ozcan.mp3",
  "/audio/sabah_fakhry.mp3",
];

self.addEventListener("install", (event) => {
  const root = self.location.origin;
  event.waitUntil(
    caches
      .open(CACHE_AUDIO)
      .then(async (cache) => {
        await Promise.allSettled(
          AUDIO_PATHS.map((path) =>
            cache
              .add(new Request(root + path, { cache: "reload" }))
              .catch(() => {})
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((k) => {
            if (k.startsWith("ctp-azan-audio-") && k !== CACHE_AUDIO) {
              return caches.delete(k);
            }
            return undefined;
          })
        )
      )
      .then(() => self.clients.claim())
  );
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
