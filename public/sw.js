/* Service worker — PWA offline azan. Paths must match `webAudioPath()` in `src/azan.ts` (BASE_URL + `audio/<file>`). */
const CACHE_AUDIO = "ctp-azan-audio-v3";

/** Basenames under `audio/` — keep in sync with every `offlineFile` in `src/azan.ts`. */
const AUDIO_FILES = [
  "aaqib_azeez.mp3",
  "adhan_classic.ogg",
  "ahmad_nafees.mp3",
  "beautiful_adhan.ogg",
  "islamic_call_worship.oga",
  "karl_jenkins.mp3",
  "mansour_zahrani.mp3",
  "masjid_al_haram.webm",
  "mishary_alt.mp3",
  "mishary_dubai.mp3",
  "mishary_sc_01_160922833.m4a",
  "mishary_sc_02_160923210.m4a",
  "mishary_sc_03_160922604.m4a",
  "mishary_sc_04_160922603.m4a",
  "mishary_sc_05_160922602.m4a",
  "mishary_sc_06_160922601.m4a",
  "mishary_sc_07_160922600.m4a",
  "mishary_sc_08_160921786.m4a",
  "mishary_sc_09_160921785.m4a",
  "mishary_sc_10_160921783.m4a",
  "mishary_sc_11_160921782.m4a",
  "mishary_sc_12_160921781.m4a",
  "mishary_sc_13_160921108.m4a",
  "mishary_sc_14_160921107.m4a",
  "mishary_sc_15_160919244.m4a",
  "mishary_sc_16_160919243.m4a",
  "mishary_sc_17_160919242.m4a",
  "mishary_sc_18_160919241.m4a",
  "mishary_sc_19_160919240.m4a",
  "mishary_sc_20_160919239.m4a",
  "mishary_sc_21_160919238.m4a",
  "mishary_sc_22_160919237.m4a",
  "mishary_sc_23_160919236.m4a",
  "mishary_sc_24_160919235.m4a",
  "mishary_sc_25_160919234.m4a",
  "mishary_sc_26_160919233.m4a",
  "mishary_sc_27_160919232.m4a",
  "mishary_yet_another.mp3",
  "mustafa_ozcan.mp3",
  "sabah_fakhry.mp3",
];

function audioUrlsForScope(scopeUrl) {
  const base = scopeUrl.endsWith("/") ? scopeUrl : `${scopeUrl}/`;
  return AUDIO_FILES.map((name) => new URL(`audio/${name}`, base).href);
}

function isBundledAudioRequest(url) {
  if (url.origin !== self.location.origin) return false;
  const p = url.pathname;
  return p.includes("/audio/");
}

self.addEventListener("install", (event) => {
  const scope = self.registration.scope;
  const urls = audioUrlsForScope(scope);
  event.waitUntil(
    caches
      .open(CACHE_AUDIO)
      .then(async (cache) => {
        await Promise.allSettled(
          urls.map((href) =>
            cache.add(new Request(href, { cache: "reload" })).catch(() => {})
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
  if (!isBundledAudioRequest(url)) {
    event.respondWith(fetch(event.request));
    return;
  }
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
});
