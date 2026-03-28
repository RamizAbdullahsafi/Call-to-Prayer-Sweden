import "./style.css";
import {
  fetchPrayerTimes,
  formatDateYMD,
  prayerInstant,
  SWEDISH_CITIES,
  type PrayerDay,
  type PrayerKey,
} from "./prayerTimes";
import {
  AZAN_VOICES,
  CUSTOM_VOICE_ID,
  DEFAULT_AZAN_PRAYER_KEYS,
  getVoiceMeta,
  loadAzanPlayEnabled,
  loadAzanPrayerKeys,
  loadAzanVolume,
  loadAzanVoiceId,
  loadCustomAzanUrl,
  playAzanFromVoiceId,
  playAzanUrl,
  resolveAzanUrl,
  saveAzanPlayEnabled,
  saveAzanPrayerKeys,
  saveAzanVolume,
  saveAzanVoiceId,
  saveCustomAzanUrl,
  setAzanPlaybackListener,
  stopAzan,
} from "./azan";
import {
  DEFAULT_NOTIFY_KEYS,
  loadNotifyKeys,
  notificationsSupported,
  requestNotificationPermission,
  saveNotifyKeys,
  startPrayerNotifications,
} from "./notifications";

const LABELS: Record<PrayerKey, { sv: string; en: string }> = {
  fajr: { sv: "Fajr", en: "Fajr" },
  sunrise: { sv: "Shuruk", en: "Sunrise" },
  dhuhr: { sv: "Dhuhr", en: "Dhuhr" },
  asr: { sv: "Asr", en: "Asr" },
  maghrib: { sv: "Maghrib", en: "Maghrib" },
  isha: { sv: "Isha", en: "Isha" },
};

const ORDER: PrayerKey[] = [
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

const CITY_CUSTOM_KEY = "ctp.ort.custom";
const NOTIFY_SILENT_KEY = "ctp.notify.silent";

function loadNotifySilent(): boolean {
  try {
    return localStorage.getItem(NOTIFY_SILENT_KEY) === "1";
  } catch {
    return false;
  }
}

function saveNotifySilent(on: boolean): void {
  try {
    localStorage.setItem(NOTIFY_SILENT_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function getNextPrayer(
  day: PrayerDay,
  now: Date
): { key: PrayerKey; at: Date } | null {
  let next: { key: PrayerKey; at: Date } | null = null;

  for (const key of ORDER) {
    const at = prayerInstant(day, key);
    if (at > now && (!next || at < next.at)) {
      next = { key, at };
    }
  }

  return next;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Nu";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} t ${m} min`;
  if (m > 0) return `${m} min ${sec} s`;
  return `${sec} s`;
}

function render(root: HTMLElement): void {
  const defaultCity = "Stockholm";
  const savedCustom = (() => {
    try {
      return localStorage.getItem(CITY_CUSTOM_KEY) ?? "";
    } catch {
      return "";
    }
  })();
  const notifyKeys = loadNotifyKeys();
  const azanPrayerKeys = loadAzanPrayerKeys();
  const volPct = Math.round(loadAzanVolume() * 100);

  root.innerHTML = `
    <header>
      <h1>Call to Prayer Sweden</h1>
      <p class="tagline">Dagens bönetider för vald ort i Sverige.</p>
      <p class="source">Tider hämtas från Islamiska förbundets officiella widget — samma källa som <strong>Muslimens Kompanjon</strong>.</p>
    </header>
    <div class="controls">
      <div>
        <label for="city">Ort</label>
        <select id="city" aria-label="Välj ort">
          ${SWEDISH_CITIES.map(
            (c) =>
              `<option value="${c}" ${c === defaultCity ? "selected" : ""}>${c}</option>`
          ).join("")}
        </select>
      </div>
      <div>
        <label for="cityCustom">Egen ort (valfritt)</label>
        <input type="text" id="cityCustom" autocomplete="address-level2" placeholder="T.ex. Ystad — används om ifylld" value="" />
      </div>
      <div class="controls-row">
        <div>
          <label for="date">Datum</label>
          <input type="date" id="date" />
        </div>
        <div style="display:flex;align-items:flex-end;">
          <button type="button" class="primary" id="load">Hämta tider</button>
        </div>
      </div>
    </div>
    <fieldset class="notify-fieldset">
      <legend>Påminnelser</legend>
      <p class="notify-hint">
        Webbläsarens aviseringar vid bönetid (samma dag som i datumfältet). Lämna gärna fliken öppen — vissa webbläsare pausar bakgrundssidor.
      </p>
      <div class="notify-actions">
        <button type="button" class="secondary" id="notify-perm">Tillåt aviseringar</button>
        <span id="perm-status" class="perm-status" aria-live="polite"></span>
      </div>
      <div class="notify-grid" id="notify-grid">
        ${ORDER.map((key) => {
          const checked = notifyKeys.has(key) ? "checked" : "";
          return `<label class="notify-item"><input type="checkbox" class="notify-prayer" data-key="${key}" ${checked} />${LABELS[key].sv}</label>`;
        }).join("")}
      </div>
      <label class="notify-silent-row">
        <input type="checkbox" id="notify-silent" />
        Tyst systemljud för avisering (ingen standardpling — adhan nedan spelas ändå om aktiverad)
      </label>
    </fieldset>
    <fieldset class="azan-fieldset">
      <legend>Adhan (ljud)</legend>
      <p class="azan-hint">
        Välj muezzin och volym. Vid bönetid spelas adhan om du tillåtit ljud och fliken kan spela (tryck &quot;Testa&quot; en gång om inget hörs). Skärmen kan hållas vaken under uppspelning om webbläsaren tillåter det.
      </p>
      <div class="azan-row azan-row-top">
        <div class="azan-grow">
          <label for="azan-voice">Röst</label>
          <select id="azan-voice" aria-label="Välj adhan-röst">
            ${AZAN_VOICES.map((v) => {
              const sub = `${v.reciter} — ${v.label}`;
              return `<option value="${v.id}">${sub}</option>`;
            }).join("")}
            <option value="${CUSTOM_VOICE_ID}">Egen länk (URL)…</option>
          </select>
        </div>
        <div class="azan-actions azan-actions-btns">
          <button type="button" class="secondary" id="azan-test">Testa</button>
          <button type="button" class="secondary" id="azan-stop" disabled>Stoppa</button>
        </div>
      </div>
      <div class="azan-volume-row">
        <label for="azan-volume">Volym <span id="azan-volume-label">${volPct}%</span></label>
        <input type="range" id="azan-volume" min="0" max="100" value="${volPct}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${volPct}" />
      </div>
      <div id="azan-custom-wrap" class="azan-custom-wrap" hidden>
        <label for="azan-custom-url">Egen MP3/OGG-URL (https)</label>
        <input type="url" id="azan-custom-url" inputmode="url" autocomplete="off" placeholder="https://…" />
      </div>
      <p class="azan-sublegend">Spela adhan vid dessa böner</p>
      <div class="notify-grid azan-prayer-grid" id="azan-prayer-grid">
        ${ORDER.map((key) => {
          const checked = azanPrayerKeys.has(key) ? "checked" : "";
          return `<label class="notify-item"><input type="checkbox" class="azan-prayer" data-key="${key}" ${checked} />${LABELS[key].sv}</label>`;
        }).join("")}
      </div>
      <div class="azan-sync-row">
        <button type="button" class="secondary" id="azan-sync-notify">Samma böner som påminnelser</button>
      </div>
      <label class="azan-play-toggle">
        <input type="checkbox" id="azan-play" />
        Spela adhan vid vald bönetid (om volym &gt; 0)
      </label>
      <div id="azan-playing" class="azan-playing" hidden role="status" aria-live="polite">
        <span class="azan-playing-dot" aria-hidden="true"></span>
        Adhan spelas…
      </div>
      <p class="azan-attrib">
        Mishary Alafasy m.fl. via <a href="https://www.aladhan.com/download-adhans" target="_blank" rel="noopener noreferrer">AlAdhan</a>
        (inkl. valfri Karl Jenkins-inspelning). Wikimedia: <a href="https://commons.wikimedia.org/wiki/Category:Adhan" target="_blank" rel="noopener noreferrer">Commons</a>.
        Uppspelning kan visas i mediekontroller (Media Session) om webbläsaren stöder det.
      </p>
    </fieldset>
    <div id="error" class="error" hidden role="alert"></div>
    <div id="next" class="next-banner" hidden></div>
    <div id="schedule" class="schedule"></div>
    <footer>
      <p>Islamiska förbundet i Sverige — <a href="https://www.islamiskaforbundet.se/muslimens-kompanjon/" target="_blank" rel="noopener noreferrer">Muslimens Kompanjon</a></p>
    </footer>
  `;

  const cityEl = root.querySelector<HTMLSelectElement>("#city")!;
  const cityCustomEl = root.querySelector<HTMLInputElement>("#cityCustom")!;
  const dateEl = root.querySelector<HTMLInputElement>("#date")!;
  const loadBtn = root.querySelector<HTMLButtonElement>("#load")!;
  const errorEl = root.querySelector<HTMLDivElement>("#error")!;
  const nextEl = root.querySelector<HTMLDivElement>("#next")!;
  const scheduleEl = root.querySelector<HTMLDivElement>("#schedule")!;
  const notifyPermBtn = root.querySelector<HTMLButtonElement>("#notify-perm")!;
  const permStatusEl = root.querySelector<HTMLSpanElement>("#perm-status")!;
  const azanVoiceEl = root.querySelector<HTMLSelectElement>("#azan-voice")!;
  const azanCustomWrap = root.querySelector<HTMLDivElement>("#azan-custom-wrap")!;
  const azanCustomUrlEl = root.querySelector<HTMLInputElement>("#azan-custom-url")!;
  const azanPlayEl = root.querySelector<HTMLInputElement>("#azan-play")!;
  const azanTestBtn = root.querySelector<HTMLButtonElement>("#azan-test")!;
  const azanStopBtn = root.querySelector<HTMLButtonElement>("#azan-stop")!;
  const azanVolumeEl = root.querySelector<HTMLInputElement>("#azan-volume")!;
  const azanVolumeLabelEl = root.querySelector<HTMLSpanElement>("#azan-volume-label")!;
  const azanPlayingEl = root.querySelector<HTMLDivElement>("#azan-playing")!;
  const azanSyncNotifyBtn = root.querySelector<HTMLButtonElement>(
    "#azan-sync-notify"
  )!;
  const notifySilentEl = root.querySelector<HTMLInputElement>("#notify-silent")!;

  cityCustomEl.value = savedCustom;

  azanVoiceEl.value = loadAzanVoiceId();
  azanCustomUrlEl.value = loadCustomAzanUrl();
  azanPlayEl.checked = loadAzanPlayEnabled();
  notifySilentEl.checked = loadNotifySilent();

  function syncAzanCustomWrap(): void {
    azanCustomWrap.hidden = azanVoiceEl.value !== CUSTOM_VOICE_ID;
  }
  syncAzanCustomWrap();

  setAzanPlaybackListener((playing) => {
    azanPlayingEl.hidden = !playing;
    azanStopBtn.disabled = !playing;
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") stopAzan();
  });

  const today = new Date();
  dateEl.valueAsDate = today;

  let countdownTimer: ReturnType<typeof setInterval> | undefined;
  let disposeNotify: () => void = () => {};
  let lastLoadedDay: PrayerDay | null = null;

  function clearCountdown(): void {
    if (countdownTimer !== undefined) {
      clearInterval(countdownTimer);
      countdownTimer = undefined;
    }
  }

  function showError(msg: string): void {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function hideError(): void {
    errorEl.hidden = true;
    errorEl.textContent = "";
  }

  function resolvedCity(): string {
    const custom = cityCustomEl.value.trim();
    return custom.length > 0 ? custom : cityEl.value;
  }

  function persistCustomCity(): void {
    try {
      const v = cityCustomEl.value.trim();
      if (v) localStorage.setItem(CITY_CUSTOM_KEY, v);
      else localStorage.removeItem(CITY_CUSTOM_KEY);
    } catch {
      /* ignore */
    }
  }

  function readNotifyKeysFromDom(): Set<PrayerKey> {
    const boxes = root.querySelectorAll<HTMLInputElement>(".notify-prayer");
    const set = new Set<PrayerKey>();
    for (const el of boxes) {
      const key = el.dataset.key as PrayerKey | undefined;
      if (key && el.checked) set.add(key);
    }
    return set;
  }

  function readAzanPrayerKeysFromDom(): Set<PrayerKey> {
    const boxes = root.querySelectorAll<HTMLInputElement>(".azan-prayer");
    const set = new Set<PrayerKey>();
    for (const el of boxes) {
      const key = el.dataset.key as PrayerKey | undefined;
      if (key && el.checked) set.add(key);
    }
    return set;
  }

  function updateVolumeLabel(pct: number): void {
    azanVolumeLabelEl.textContent = `${pct}%`;
    azanVolumeEl.setAttribute("aria-valuenow", String(pct));
  }

  function updatePermStatus(): void {
    if (!notificationsSupported()) {
      permStatusEl.textContent = "Stöds inte i den här webbläsaren.";
      notifyPermBtn.disabled = true;
      return;
    }
    const p = Notification.permission;
    if (p === "granted") permStatusEl.textContent = "Aviseringar är på.";
    else if (p === "denied")
      permStatusEl.textContent = "Blockerade — ändra under webbläsarens inställningar.";
    else permStatusEl.textContent = "Inte aktiverat ännu.";
  }

  function restartNotifications(): void {
    disposeNotify();
    if (!notificationsSupported() || Notification.permission !== "granted") return;
    if (!lastLoadedDay) return;
    if (lastLoadedDay.date !== formatDateYMD(new Date())) return;

    const keys = readNotifyKeysFromDom();
    if (keys.size === 0) return;

    saveNotifyKeys(keys);
    disposeNotify = startPrayerNotifications(
      lastLoadedDay,
      keys,
      () => {
        disposeNotify();
        dateEl.valueAsDate = new Date();
        void load();
      },
      {
        onPrayerTime: (key) => {
          if (!loadAzanPlayEnabled()) return;
          if (loadAzanVolume() <= 0) return;
          if (!loadAzanPrayerKeys().has(key)) return;
          playAzanFromVoiceId(loadAzanVoiceId());
        },
        getNotificationSilent: () => notifySilentEl.checked,
      }
    );
  }

  function renderSchedule(day: PrayerDay, nextKey: PrayerKey | null): void {
    scheduleEl.innerHTML = ORDER.map((key) => {
      const { sv, en } = LABELS[key];
      const time = day.schedule[key];
      const next = nextKey === key ? " is-next" : "";
      return `
        <div class="prayer-row${next}" data-prayer="${key}">
          <div>
            <span class="name-sv">${sv}</span>
            <span class="name-en">${en}</span>
          </div>
          <time datetime="${day.date}T${time}">${time}</time>
        </div>
      `;
    }).join("");
  }

  function updateNextBanner(day: PrayerDay): void {
    clearCountdown();
    const now = new Date();
    const next = getNextPrayer(day, now);

    if (!next) {
      nextEl.hidden = true;
      renderSchedule(day, null);
      return;
    }

    const { sv } = LABELS[next.key];
    const tick = (): void => {
      const n = new Date();
      const diff = next.at.getTime() - n.getTime();
      const sub = nextEl.querySelector(".countdown");
      if (sub) sub.textContent = formatCountdown(diff);
      if (diff <= 0) {
        clearCountdown();
        void load();
      }
    };

    nextEl.innerHTML = `
      <div class="label">Nästa bön</div>
      <div class="name">${sv} · ${day.schedule[next.key]}</div>
      <div class="countdown">${formatCountdown(next.at.getTime() - now.getTime())}</div>
    `;
    nextEl.hidden = false;
    renderSchedule(day, next.key);
    countdownTimer = setInterval(tick, 1000);
  }

  async function load(): Promise<void> {
    hideError();
    loadBtn.disabled = true;
    clearCountdown();
    disposeNotify();
    disposeNotify = () => {};
    nextEl.hidden = true;
    scheduleEl.innerHTML = "";

    const city = resolvedCity();
    const d = dateEl.valueAsDate;
    if (!d) {
      showError("Välj ett datum.");
      loadBtn.disabled = false;
      return;
    }

    try {
      const day = await fetchPrayerTimes(city, d);
      lastLoadedDay = day;
      updateNextBanner(day);
      restartNotifications();
    } catch (e) {
      lastLoadedDay = null;
      showError(e instanceof Error ? e.message : "Något gick fel.");
    } finally {
      loadBtn.disabled = false;
    }
  }

  updatePermStatus();

  loadBtn.addEventListener("click", () => void load());
  cityEl.addEventListener("change", () => void load());
  dateEl.addEventListener("change", () => void load());
  cityCustomEl.addEventListener("change", () => {
    persistCustomCity();
    void load();
  });
  cityCustomEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      persistCustomCity();
      void load();
    }
  });

  notifyPermBtn.addEventListener("click", async () => {
    await requestNotificationPermission();
    updatePermStatus();
    restartNotifications();
  });

  root.querySelector("#notify-grid")!.addEventListener("change", () => {
    let keys = readNotifyKeysFromDom();
    if (keys.size === 0) {
      for (const el of root.querySelectorAll<HTMLInputElement>(".notify-prayer")) {
        const k = el.dataset.key as PrayerKey;
        el.checked = DEFAULT_NOTIFY_KEYS.includes(k);
      }
      keys = readNotifyKeysFromDom();
    }
    saveNotifyKeys(keys);
    restartNotifications();
  });

  azanVoiceEl.addEventListener("change", () => {
    saveAzanVoiceId(azanVoiceEl.value);
    syncAzanCustomWrap();
    restartNotifications();
  });

  azanCustomUrlEl.addEventListener("change", () => {
    saveCustomAzanUrl(azanCustomUrlEl.value);
    restartNotifications();
  });

  azanPlayEl.addEventListener("change", () => {
    saveAzanPlayEnabled(azanPlayEl.checked);
    restartNotifications();
  });

  azanTestBtn.addEventListener("click", () => {
    saveAzanVoiceId(azanVoiceEl.value);
    if (azanVoiceEl.value === CUSTOM_VOICE_ID) {
      saveCustomAzanUrl(azanCustomUrlEl.value);
    }
    const url = resolveAzanUrl(azanVoiceEl.value);
    if (!url) {
      showError(
        azanVoiceEl.value === CUSTOM_VOICE_ID
          ? "Ange en giltig http(s)-URL till en MP3- eller OGG-fil."
          : "Kunde inte spela upp — välj en annan röst."
      );
      return;
    }
    hideError();
    playAzanUrl(url, getVoiceMeta(azanVoiceEl.value));
  });

  azanStopBtn.addEventListener("click", () => {
    stopAzan();
  });

  azanVolumeEl.addEventListener("input", () => {
    const pct = Number(azanVolumeEl.value);
    saveAzanVolume(pct / 100);
    updateVolumeLabel(pct);
  });

  notifySilentEl.addEventListener("change", () => {
    saveNotifySilent(notifySilentEl.checked);
    restartNotifications();
  });

  root.querySelector("#azan-prayer-grid")!.addEventListener("change", () => {
    let keys = readAzanPrayerKeysFromDom();
    if (keys.size === 0) {
      for (const el of root.querySelectorAll<HTMLInputElement>(".azan-prayer")) {
        const k = el.dataset.key as PrayerKey;
        el.checked = DEFAULT_AZAN_PRAYER_KEYS.includes(k);
      }
      keys = readAzanPrayerKeysFromDom();
    }
    saveAzanPrayerKeys(keys);
    restartNotifications();
  });

  azanSyncNotifyBtn.addEventListener("click", () => {
    const nk = readNotifyKeysFromDom();
    for (const el of root.querySelectorAll<HTMLInputElement>(".azan-prayer")) {
      const k = el.dataset.key as PrayerKey;
      el.checked = nk.has(k);
    }
    saveAzanPrayerKeys(nk);
    restartNotifications();
  });

  void load();
}

render(document.querySelector<HTMLDivElement>("#app")!);
