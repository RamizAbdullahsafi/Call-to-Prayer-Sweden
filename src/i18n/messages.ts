import type { Locale } from "./types";

export type MessageId =
  | "skipToContent"
  | "appTitle"
  | "tagline"
  | "controlsAria"
  | "disclosureLocationTitle"
  | "mainNavAria"
  | "tabPrayer"
  | "tabPrayerLead"
  | "tabQibla"
  | "tabQiblaLead"
  | "tabCalendar"
  | "tabCalendarLead"
  | "tabSettings"
  | "settingsSection"
  | "city"
  | "citySelectAria"
  | "cityCustom"
  | "cityCustomPlaceholder"
  | "date"
  | "loadTimes"
  | "loading"
  | "language"
  | "reminders"
  | "remindersHint"
  | "notificationsNativeReliability"
  | "androidExactAlarmsHint"
  | "androidExactAlarmsOpen"
  | "exactAlarmsGranted"
  | "exactAlarmsDenied"
  | "allowNotifications"
  | "permNotSupported"
  | "permGranted"
  | "permDenied"
  | "permDefault"
  | "notifySilent"
  | "adhan"
  | "adhanHintBefore"
  | "adhanHintAfter"
  | "voice"
  | "voiceSelectAria"
  | "test"
  | "stop"
  | "volume"
  | "adhanForPrayers"
  | "syncAdhanWithNotify"
  | "playAdhanOnNotify"
  | "adhanPlaying"
  | "adhanSeek"
  | "adhanPlaybackFailed"
  | "adhanPerPrayerTitle"
  | "loadingTimesAria"
  | "offlineCachedTimes"
  | "nextPrayer"
  | "scheduleHeading"
  | "footerAttribution"
  | "footerLinkLabel"
  | "footerCreatedBy"
  | "footerCopyright"
  | "footerLegalNavAria"
  | "privacy"
  | "terms"
  | "cookiesPolicy"
  | "disclaimer"
  | "countdownNow"
  | "countdownHoursShort"
  | "countdownMinShort"
  | "countdownSecShort"
  | "errors.selectDate"
  | "errors.fetchFailed"
  | "errors.parseFailed"
  | "errors.cityNotFound"
  | "errors.generic"
  | "prayer.fajr"
  | "prayer.sunrise"
  | "prayer.dhuhr"
  | "prayer.asr"
  | "prayer.maghrib"
  | "prayer.isha"
  | "prayer.jumuah"
  | "prayerSecondary.fajr"
  | "prayerSecondary.sunrise"
  | "prayerSecondary.dhuhr"
  | "prayerSecondary.asr"
  | "prayerSecondary.maghrib"
  | "prayerSecondary.isha"
  | "prayerSecondary.jumuah"
  | "jumuahHint"
  | "ramadanCardTitle"
  | "imsakLabel"
  | "iftarLabel"
  | "ramadanCardNote"
  | "qiblaTitle"
  | "qiblaGpsHint"
  | "qiblaBearing"
  | "hijriCalendarTitle"
  | "hijriSummaryTitle"
  | "calPrevMonth"
  | "calNextMonth"
  | "calMonthPagerHint"
  | "hijriEvent.ramadanStart"
  | "hijriEvent.laylatQadr"
  | "hijriEvent.eidFitr"
  | "hijriEvent.arafah"
  | "hijriEvent.eidAdha"
  | "appDownloadBannerTitle"
  | "appDownloadBannerBody"
  | "appDownloadBannerIosBody"
  | "appDownloadBannerInstall"
  | "appDownloadBannerDismiss"
  | "batteryOptimizationHint"
  | "batteryOptimizationOpen"
  | "androidSetupTitle"
  | "androidSetupIntro"
  | "androidSetupStepNotifications"
  | "androidSetupStepExact"
  | "androidSetupStepBattery"
  | "androidSetupBatteryButton"
  | "batteryUnrestrictedOk";

type Messages = Record<MessageId, string>;

const sv: Messages = {
  skipToContent: "Hoppa till innehåll",
  appTitle: "Call to Prayer Sweden",
  tagline:
    "Bönetider för svenska orter — från Islamiska förbundet i Sverige.",
  controlsAria: "Ort och datum",
  disclosureLocationTitle: "Plats, datum och läge",
  mainNavAria: "Huvudnavigering",
  tabPrayer: "Bönetider",
  tabPrayerLead:
    "Officiella tider för vald ort och datum — nästa bön och dagens schema.",
  tabQibla: "Qibla",
  tabQiblaLead:
    "Riktning mot Kaba utifrån din position. Aktivera GPS och vid behov kompass.",
  tabCalendar: "Kalender",
  tabCalendarLead:
    "Hijridatum, månadsvy och koppling till den valda gregorianska dagen.",
  tabSettings: "Inställningar",
  settingsSection: "Språk, aviseringar och azan",
  city: "Ort",
  citySelectAria: "Välj ort",
  cityCustom: "Annan ort (valfritt)",
  cityCustomPlaceholder: "Skriv ort om den inte finns i listan",
  date: "Datum",
  loadTimes: "Visa tider",
  loading: "Laddar…",
  language: "Språk",
  reminders: "Påminnelser",
  remindersHint:
    "Avisering när det är dags att be (dagens datum). Låt gärna sidan vara öppen.",
  notificationsNativeReliability:
    "I appen planeras påminnelser långt fram i tiden (Android: upp till ca 60 dagar; iPhone: begränsat). Android kan förnya schemat ungefär en gång per dygn i bakgrunden om appen byggts med rätt webbadress (VITE_API_ORIGIN). Tillåt aviseringar och exakta larm; stäng av batterioptimering om tiderna blir försenade (Inställningar → Appar → Prayer Sweden → Batteri / Aviseringar).",
  androidExactAlarmsHint:
    "På Android 12 och senare behöver appen tillåtelse för exakta larm så att påminnelser kommer vid rätt bönetid (inte bara ungefär).",
  androidExactAlarmsOpen: "Exakta larm (Android)",
  exactAlarmsGranted: "Exakta larm: på.",
  exactAlarmsDenied: "Exakta larm: av — tryck knappen och tillåt i systeminställningarna.",
  allowNotifications: "Tillåt aviseringar",
  permNotSupported: "Stöds inte i den här webbläsaren.",
  permGranted: "Aviseringar är på.",
  permDenied: "Blockerade — ändra under webbläsarens inställningar.",
  permDefault: "Inte aktiverat ännu.",
  notifySilent: "Ingen aviseringspling (azan kan fortfarande spelas nedan)",
  adhan: "Azan",
  adhanHintBefore: "Välj röst och volym. Använd",
  adhanHintAfter: "om ljud inte hörs första gången.",
  voice: "Röst",
  voiceSelectAria: "Välj azan-röst",
  test: "Testa",
  stop: "Stoppa",
  volume: "Volym",
  adhanForPrayers: "Azan vid dessa böner",
  syncAdhanWithNotify: "Samma böner som påminnelser",
  playAdhanOnNotify: "Spela azan vid påminnelse",
  adhanPlaying: "Azan spelas…",
  adhanSeek: "Spola i azan",
  adhanPlaybackFailed:
    "Kunde inte spela upp azan. Kontrollera anslutningen eller prova en annan röst.",
  adhanPerPrayerTitle: "Röst per bönetid",
  loadingTimesAria: "Laddar bönetider…",
  offlineCachedTimes: "Visar sparade bönetider (offline).",
  nextPrayer: "Nästa bön",
  scheduleHeading: "Dagens bönetider",
  footerAttribution: "Bönetider: ",
  footerLinkLabel: "Islamiska förbundet",
  footerCreatedBy: "Skapad av RASafi Tech",
  footerCopyright: "© 2026 RASafi Tech. Alla rättigheter förbehållna.",
  footerLegalNavAria: "Juridik och policyer",
  privacy: "Integritet",
  terms: "Villkor",
  cookiesPolicy: "Cookies",
  disclaimer: "Ansvar",
  countdownNow: "Nu",
  countdownHoursShort: "t",
  countdownMinShort: "min",
  countdownSecShort: "s",
  "errors.selectDate": "Välj ett datum.",
  "errors.fetchFailed": "Kunde inte hämta bönetider ({{status}}).",
  "errors.parseFailed":
    "Inga bönetider hittades. Kontrollera ortnamnet.",
  "errors.cityNotFound":
    "Ortnamnet hittades inte hos bönetiderna. Använd svenskt namn (t.ex. Göteborg), välj i listan eller tryck «Visa tider» när du skrivit klart.",
  "errors.generic": "Något gick fel.",
  "prayer.fajr": "Fajr",
  "prayer.sunrise": "Shuruk",
  "prayer.dhuhr": "Dhuhr",
  "prayer.asr": "Asr",
  "prayer.maghrib": "Maghrib",
  "prayer.isha": "Isha",
  "prayer.jumuah": "Fredagsbön (Jumu'ah)",
  "prayerSecondary.fajr": "Fajr",
  "prayerSecondary.sunrise": "Sunrise",
  "prayerSecondary.dhuhr": "Dhuhr",
  "prayerSecondary.asr": "Asr",
  "prayerSecondary.maghrib": "Maghrib",
  "prayerSecondary.isha": "Isha",
  "prayerSecondary.jumuah": "Fredagsbön",
  jumuahHint:
    "Samma tid som Dhuhr för orten; lokala moskéer kan ha annan tid för jamaat.",
  ramadanCardTitle: "Ramadan",
  imsakLabel: "Imsak",
  iftarLabel: "Iftar",
  ramadanCardNote:
    "Fajr ≈ imsak och maghrib ≈ iftar enligt dessa tider. Bekräfta vid din moské om det skiljer sig.",
  qiblaTitle: "Qibla",
  qiblaGpsHint: "Använd GPS ovan för riktning mot Kaba.",
  qiblaBearing: "Qibla: {{deg}}° från norr",
  hijriCalendarTitle: "Kalender (Hijri)",
  hijriSummaryTitle: "Hijridatum",
  calPrevMonth: "Föregående månad",
  calNextMonth: "Nästa månad",
  calMonthPagerHint: "Byt månad med pilarna.",
  "hijriEvent.ramadanStart": "Början av Ramadan",
  "hijriEvent.laylatQadr": "Laylat al-Qadr (ca)",
  "hijriEvent.eidFitr": "Eid al-Fitr",
  "hijriEvent.arafah": "Arafadagen",
  "hijriEvent.eidAdha": "Eid al-Adha",
  appDownloadBannerTitle: "Installera på mobilen",
  appDownloadBannerBody:
    "Använd webbläsarens «Installera» / «Lägg till på hemskärmen» — samma app som på webben, utan appbutik.",
  appDownloadBannerIosBody:
    "På iPhone eller iPad: tryck Dela (□↑) och välj «Lägg till på hemskärmen».",
  appDownloadBannerInstall: "Installera",
  appDownloadBannerDismiss: "Stäng",
  batteryOptimizationHint: "För att påminnelser ska fungera tillförlitligt när telefonen inte används, stäng av batterioptimering för Prayer Sweden (välj 'Obegränsad' eller 'Optimera inte').",
  batteryOptimizationOpen: "Batteriinställningar",
  androidSetupTitle: "Tre steg för pålitliga bönelarm (Android)",
  androidSetupIntro:
    "Tryck på varje knapp och följ skärmen. Då kan aviseringar och azan spelas även när telefonen vilar.",
  androidSetupStepNotifications:
    "Aviseringar — tillåt att appen visar påminnelser.",
  androidSetupStepExact:
    "Exakta larm — behövs så bönetiden inte bara blir ungefärlig.",
  androidSetupStepBattery:
    "Batteri — låt inte systemet stänga av appen i bakgrunden.",
  androidSetupBatteryButton: "Öppna app- och batteriinställningar",
  batteryUnrestrictedOk: "Batteri: ej begränsat (bra) ✓",
};

const en: Messages = {
  skipToContent: "Skip to content",
  appTitle: "Call to Prayer Sweden",
  tagline:
    "Prayer times for Swedish locations — from Islamiska förbundet (Islamic Association of Sweden).",
  controlsAria: "Location and date",
  disclosureLocationTitle: "Location, date & mode",
  mainNavAria: "Main navigation",
  tabPrayer: "Prayer times",
  tabPrayerLead:
    "Official times for your city and date — next prayer and today’s schedule.",
  tabQibla: "Qibla",
  tabQiblaLead:
    "Direction toward the Kaaba from your position. Enable GPS and compass if needed.",
  tabCalendar: "Calendar",
  tabCalendarLead:
    "Hijri calendar, month view, and link to the selected Gregorian date.",
  tabSettings: "Settings",
  settingsSection: "Language, notifications, and azan",
  city: "City",
  citySelectAria: "Select city",
  cityCustom: "Other city (optional)",
  cityCustomPlaceholder: "Enter a city if not in the list",
  date: "Date",
  loadTimes: "Show times",
  loading: "Loading…",
  language: "Language",
  reminders: "Reminders",
  remindersHint:
    "Notifications when it is time to pray (today’s date). Keep the page open if you can.",
  notificationsNativeReliability:
    "Native app: reminders are scheduled well ahead (Android: up to about 60 days; iPhone: limited). Android can refresh about once a day in the background if you built with VITE_API_ORIGIN set to your live site. Allow notifications and exact alarms; turn off battery optimization if alerts are delayed (Settings → Apps → Prayer Sweden → Battery / Notifications).",
  androidExactAlarmsHint:
    "On Android 12+, the app needs permission for exact alarms so reminders fire at prayer time (not only approximately).",
  androidExactAlarmsOpen: "Exact alarms (Android)",
  exactAlarmsGranted: "Exact alarms: on.",
  exactAlarmsDenied: "Exact alarms: off — use the button and allow in system settings.",
  allowNotifications: "Allow notifications",
  permNotSupported: "Not supported in this browser.",
  permGranted: "Notifications are on.",
  permDenied: "Blocked — change this in your browser settings.",
  permDefault: "Not enabled yet.",
  notifySilent:
    "No notification sound (azan can still play below)",
  adhan: "Azan",
  adhanHintBefore: "Choose voice and volume. Use",
  adhanHintAfter: "if you hear no sound the first time.",
  voice: "Voice",
  voiceSelectAria: "Choose azan voice",
  test: "Test",
  stop: "Stop",
  volume: "Volume",
  adhanForPrayers: "Azan for these prayers",
  syncAdhanWithNotify: "Same prayers as reminders",
  playAdhanOnNotify: "Play azan with reminder",
  adhanPlaying: "Playing azan…",
  adhanSeek: "Seek in azan",
  adhanPlaybackFailed:
    "Could not play azan. Check your connection or try another voice.",
  adhanPerPrayerTitle: "Voice per prayer time",
  loadingTimesAria: "Loading prayer times…",
  offlineCachedTimes: "Showing saved prayer times (offline).",
  nextPrayer: "Next prayer",
  scheduleHeading: "Prayer times",
  footerAttribution: "Prayer times: ",
  footerLinkLabel: "Islamiska förbundet",
  footerCreatedBy: "Created by RASafi Tech",
  footerCopyright: "© 2026 RASafi Tech. All rights reserved.",
  footerLegalNavAria: "Legal and policies",
  privacy: "Privacy",
  terms: "Terms",
  cookiesPolicy: "Cookies",
  disclaimer: "Disclaimer",
  countdownNow: "Now",
  countdownHoursShort: "h",
  countdownMinShort: "min",
  countdownSecShort: "s",
  "errors.selectDate": "Choose a date.",
  "errors.fetchFailed": "Could not load prayer times ({{status}}).",
  "errors.parseFailed": "No prayer times found. Check the city name.",
  "errors.cityNotFound":
    "That place was not found. Use the Swedish name (e.g. Göteborg), pick from the list, or tap “Show times” when finished typing.",
  "errors.generic": "Something went wrong.",
  "prayer.fajr": "Fajr",
  "prayer.sunrise": "Shuruk",
  "prayer.dhuhr": "Dhuhr",
  "prayer.asr": "Asr",
  "prayer.maghrib": "Maghrib",
  "prayer.isha": "Isha",
  "prayer.jumuah": "Jumu'ah (Friday prayer)",
  "prayerSecondary.fajr": "Fajr",
  "prayerSecondary.sunrise": "Sunrise",
  "prayerSecondary.dhuhr": "Dhuhr",
  "prayerSecondary.asr": "Asr",
  "prayerSecondary.maghrib": "Maghrib",
  "prayerSecondary.isha": "Isha",
  "prayerSecondary.jumuah": "Friday congregational prayer",
  jumuahHint:
    "Shown at Dhuhr for this location; mosques may set a different jamaat time.",
  ramadanCardTitle: "Ramadan",
  imsakLabel: "Imsak (fast begins)",
  iftarLabel: "Iftar (fast ends)",
  ramadanCardNote:
    "Fajr is shown as imsak and maghrib as iftar here; confirm with your mosque if needed.",
  qiblaTitle: "Qibla",
  qiblaGpsHint: "Use GPS above for direction to the Kaaba.",
  qiblaBearing: "Qibla: {{deg}}° from north",
  hijriCalendarTitle: "Calendar (Hijri)",
  hijriSummaryTitle: "Islamic date (Hijri)",
  calPrevMonth: "Previous month",
  calNextMonth: "Next month",
  calMonthPagerHint: "Change month with the arrows.",
  "hijriEvent.ramadanStart": "Start of Ramadan",
  "hijriEvent.laylatQadr": "Laylat al-Qadr (approx.)",
  "hijriEvent.eidFitr": "Eid al-Fitr",
  "hijriEvent.arafah": "Day of Arafah",
  "hijriEvent.eidAdha": "Eid al-Adha",
  appDownloadBannerTitle: "Install this app",
  appDownloadBannerBody:
    "Use your browser’s Install or Add to Home screen option — same web app, no app store.",
  appDownloadBannerIosBody:
    "On iPhone or iPad: tap Share, then Add to Home Screen.",
  appDownloadBannerInstall: "Install",
  appDownloadBannerDismiss: "Dismiss",
  batteryOptimizationHint: "To ensure reminders fire reliably while the phone is idle, disable battery optimization for Prayer Sweden (select 'Unrestricted' or 'Don't optimize').",
  batteryOptimizationOpen: "Battery settings",
  androidSetupTitle: "Three steps for reliable prayer alerts (Android)",
  androidSetupIntro:
    "Tap each button and follow the screen. This lets reminders and azan play even when your phone is idle.",
  androidSetupStepNotifications:
    "Notifications — allow this app to show alerts.",
  androidSetupStepExact:
    "Exact alarms — needed so prayer times ring on time, not roughly.",
  androidSetupStepBattery:
    "Battery — stop the system from putting the app to sleep.",
  androidSetupBatteryButton: "Open app & battery settings",
  batteryUnrestrictedOk: "Battery: unrestricted ✓",
};

const ar: Messages = {
  skipToContent: "تخطي إلى المحتوى",
  appTitle: "Call to Prayer Sweden",
  tagline:
    "أوقات الصلاة للمدن السويدية — من الاتحاد الإسلامي في السويد.",
  controlsAria: "المدينة والتاريخ",
  disclosureLocationTitle: "الموقع والتاريخ والوضع",
  mainNavAria: "التنقل الرئيسي",
  tabPrayer: "أوقات الصلاة",
  tabPrayerLead:
    "أوقات رسمية للمدينة والتاريخ المختارين — الصلاة القادمة وجدول اليوم.",
  tabQibla: "القبلة",
  tabQiblaLead:
    "الاتجاه نحو الكعبة من موقعك. فعّل تحديد الموقع والبوصلة عند الحاجة.",
  tabCalendar: "التقويم",
  tabCalendarLead:
    "التقويم الهجري وعرض الشهر والربط بالتاريخ الميلادي المختار.",
  tabSettings: "الإعدادات",
  settingsSection: "اللغة والإشعارات والأذان",
  city: "المدينة",
  citySelectAria: "اختر المدينة",
  cityCustom: "مدينة أخرى (اختياري)",
  cityCustomPlaceholder: "أدخل المدينة إن لم تكن في القائمة",
  date: "التاريخ",
  loadTimes: "عرض الأوقات",
  loading: "جارٍ التحميل…",
  language: "اللغة",
  reminders: "التذكيرات",
  remindersHint:
    "إشعار عند وقت الصلاة (تاريخ اليوم). يُفضّل إبقاء الصفحة مفتوحة.",
  notificationsNativeReliability:
    "التطبيق يجدول التذكيرات لأسابيع مسبقاً (أندرويد: حتى نحو 60 يوماً؛ آيفون: بحد أقصى أقل). يمكن لأندرويد التحديث يومياً في الخلفية إذا بُني التطبيق بعنوان API صحيح. اسمح بالإشعارات والمنبهات الدقيقة وأوقف تحسين البطارية عند التأخير (الإعدادات → التطبيقات → Prayer Sweden).",
  androidExactAlarmsHint:
    "على أندرويد 12 فما فوق، يحتاج التطبيق إذن المنبهات الدقيقة ليصل التذكير في وقت الصلاة.",
  androidExactAlarmsOpen: "منبهات دقيقة (أندرويد)",
  exactAlarmsGranted: "المنبهات الدقيقة: مفعّلة.",
  exactAlarmsDenied: "المنبهات الدقيقة: غير مفعّلة — استخدم الزر والسماح من إعدادات النظام.",
  allowNotifications: "السماح بالإشعارات",
  permNotSupported: "غير مدعوم في هذا المتصفح.",
  permGranted: "الإشعارات مفعّلة.",
  permDenied: "محظورة — غيّر ذلك من إعدادات المتصفح.",
  permDefault: "غير مفعّلة بعد.",
  notifySilent:
    "بدون صوت إشعار (يمكن تشغيل الأذان أدناه)",
  adhan: "الأذان",
  adhanHintBefore: "اختر الصوت والمستوى. استخدم",
  adhanHintAfter: "إذا لم تسمع الصوت في المرة الأولى.",
  voice: "الصوت",
  voiceSelectAria: "اختر صوت الأذان",
  test: "تجربة",
  stop: "إيقاف",
  volume: "الصوت",
  adhanForPrayers: "أذان لهذه الصلوات",
  syncAdhanWithNotify: "نفس الصلوات كالتذكيرات",
  playAdhanOnNotify: "تشغيل الأذان مع التذكير",
  adhanPlaying: "جارٍ تشغيل الأذان…",
  adhanSeek: "الانتقال داخل الأذان",
  adhanPlaybackFailed:
    "تعذّر تشغيل الأذان. تحقق من الاتصال أو جرّب صوتًا آخر.",
  adhanPerPrayerTitle: "صوت لكل صلاة",
  loadingTimesAria: "جارٍ تحميل أوقات الصلاة…",
  offlineCachedTimes: "يتم عرض أوقات صلاة محفوظة (بدون إنترنت).",
  nextPrayer: "الصلاة التالية",
  scheduleHeading: "أوقات الصلاة",
  footerAttribution: "أوقات الصلاة: ",
  footerLinkLabel: "الاتحاد الإسلامي في السويد",
  footerCreatedBy: "تم الإنشاء بواسطة RASafi Tech",
  footerCopyright: "© 2026 RASafi Tech. جميع الحقوق محفوظة.",
  footerLegalNavAria: "قانوني وسياسات",
  privacy: "الخصوصية",
  terms: "الشروط",
  cookiesPolicy: "ملفات تعريف الارتباط",
  disclaimer: "إخلاء المسؤولية",
  countdownNow: "الآن",
  countdownHoursShort: "س",
  countdownMinShort: "د",
  countdownSecShort: "ث",
  "errors.selectDate": "اختر تاريخاً.",
  "errors.fetchFailed": "تعذّر تحميل أوقات الصلاة ({{status}}).",
  "errors.parseFailed": "لم يُعثر على أوقات. تحقّق من اسم المدينة.",
  "errors.cityNotFound":
    "لم يُعثر على المدينة. استخدم الاسم السويدي أو اختر من القائمة أو اضغط عرض الأوقات بعد الانتهاء من الكتابة.",
  "errors.generic": "حدث خطأ ما.",
  "prayer.fajr": "الفجر",
  "prayer.sunrise": "الشروق",
  "prayer.dhuhr": "الظهر",
  "prayer.asr": "العصر",
  "prayer.maghrib": "المغرب",
  "prayer.isha": "العشاء",
  "prayer.jumuah": "الجمعة",
  "prayerSecondary.fajr": "Fajr",
  "prayerSecondary.sunrise": "Sunrise",
  "prayerSecondary.dhuhr": "Dhuhr",
  "prayerSecondary.asr": "Asr",
  "prayerSecondary.maghrib": "Maghrib",
  "prayerSecondary.isha": "Isha",
  "prayerSecondary.jumuah": "صلاة الجمعة",
  jumuahHint:
    "تُعرض كوقت الظهر لهذه المدينة؛ قد يختلف وقت الجماعة في المسجد.",
  ramadanCardTitle: "رمضان",
  imsakLabel: "الإمساك",
  iftarLabel: "الإفطار",
  ramadanCardNote:
    "الفجر يُعرض كوقت إمساك والمغرب كإفطار؛ تأكد من مسجدك عند الاختلاف.",
  qiblaTitle: "القبلة",
  qiblaGpsHint: "استخدم تحديد الموقع أعلاه للاتجاه نحو الكعبة.",
  qiblaBearing: "القبلة: {{deg}}° من الشمال",
  hijriCalendarTitle: "التقويم (هجري)",
  hijriSummaryTitle: "التاريخ الهجري",
  calPrevMonth: "الشهر السابق",
  calNextMonth: "الشهر التالي",
  calMonthPagerHint: "غيّر الشهر باستخدام الأسهم.",
  "hijriEvent.ramadanStart": "بداية رمضان",
  "hijriEvent.laylatQadr": "ليلة القدر (تقريباً)",
  "hijriEvent.eidFitr": "عيد الفطر",
  "hijriEvent.arafah": "يوم عرفة",
  "hijriEvent.eidAdha": "عيد الأضحى",
  appDownloadBannerTitle: "ثبّت التطبيق",
  appDownloadBannerBody:
    "استخدم «تثبيت» أو «إضافة إلى الشاشة الرئيسية» من المتصفح — نفس الموقع دون متجر تطبيقات.",
  appDownloadBannerIosBody:
    "على آيفون أو آيباد: اضغط مشاركة ثم «إضافة إلى الشاشة الرئيسية».",
  appDownloadBannerInstall: "تثبيت",
  appDownloadBannerDismiss: "إغلاق",
  batteryOptimizationHint: "لضمان عمل التذكيرات بشكل موثوق عندما يكون الهاتف في وضع السكون، قم بإيقاف تحسين البطارية لـ Prayer Sweden (اختر 'غير مقيد').",
  batteryOptimizationOpen: "إعدادات البطارية",
  androidSetupTitle: "ثلاث خطوات لتنبيهات موثوقة (أندرويد)",
  androidSetupIntro:
    "اضغط كل زر واتبع الشاشة. يسمح ذلك للتنبيهات والأذان بالعمل حتى عندما يكون الهاتف في وضع السكون.",
  androidSetupStepNotifications: "الإشعارات — اسمح للتطبيق بعرض التنبيهات.",
  androidSetupStepExact:
    "المنبهات الدقيقة — مطلوبة حتى تصل أوقات الصلاة في وقتها.",
  androidSetupStepBattery: "البطارية — لا تدع النظام يوقف التطبيق في الخلفية.",
  androidSetupBatteryButton: "فتح إعدادات التطبيق والبطارية",
  batteryUnrestrictedOk: "البطارية: غير مقيدة ✓",
};

const fa: Messages = {
  skipToContent: "پرش به محتوا",
  appTitle: "Call to Prayer Sweden",
  tagline:
    "اوقات نماز برای شهرهای سوئد — از اتحادیه اسلامی سوئد.",
  controlsAria: "شهر و تاریخ",
  disclosureLocationTitle: "مکان، تاریخ و حالت اذان",
  mainNavAria: "ناوبری اصلی",
  tabPrayer: "اوقات نماز",
  tabPrayerLead:
    "اوقات رسمی برای شهر و تاریخ انتخاب‌شده — نماز بعدی و برنامهٔ امروز.",
  tabQibla: "قبله",
  tabQiblaLead:
    "جهت به سمت کعبه از موقعیت شما. در صورت نیاز GPS و قطب‌نما را فعال کنید.",
  tabCalendar: "تقویم",
  tabCalendarLead:
    "تقویم هجری، نمای ماه و ارتباط با تاریخ میلادی انتخاب‌شده.",
  tabSettings: "تنظیمات",
  settingsSection: "زبان، اعلان‌ها و اذان",
  city: "شهر",
  citySelectAria: "انتخاب شهر",
  cityCustom: "شهر دیگر (اختیاری)",
  cityCustomPlaceholder: "اگر در فهرست نیست، نام شهر را بنویسید",
  date: "تاریخ",
  loadTimes: "نمایش اوقات",
  loading: "در حال بارگذاری…",
  language: "زبان",
  reminders: "یادآورها",
  remindersHint:
    "اعلان هنگام وقت نماز (تاریخ امروز). بهتر است صفحه باز بماند.",
  notificationsNativeReliability:
    "در نسخهٔ اپ یادآورها تا هفته‌ها جلو زمان‌بندی می‌شوند (اندروید: حدود 60 روز؛ آیفون: محدود). اندروید می‌تواند روزانه در پس‌زمینه تازه کند اگر با VITE_API_ORIGIN درست بیلد شده باشد. اعلان و زنگ دقیق را مجاز کنید؛ در صورت تأخیر بهینه‌سازی باتری را خاموش کنید.",
  androidExactAlarmsHint:
    "در اندروید 12 به بالا، برنامه برای زنگ دقیق در وقت نماز به اجازه نیاز دارد.",
  androidExactAlarmsOpen: "زنگ‌های دقیق (اندروید)",
  exactAlarmsGranted: "زنگ‌های دقیق: روشن.",
  exactAlarmsDenied: "زنگ‌های دقیق: خاموش — دکمه را بزنید و در تنظیمات سیستم اجازه دهید.",
  allowNotifications: "اجازه اعلان‌ها",
  permNotSupported: "در این مرورگر پشتیبانی نمی‌شود.",
  permGranted: "اعلان‌ها فعال است.",
  permDenied: "مسدود — از تنظیمات مرورگر تغییر دهید.",
  permDefault: "هنوز فعال نشده.",
  notifySilent:
    "بدون صدای اعلان (اذان می‌تواند پایین پخش شود)",
  adhan: "اذان",
  adhanHintBefore: "صدای پخش و ولوم را انتخاب کنید. از",
  adhanHintAfter: "اگر بار اول صدا نمی‌شنید استفاده کنید.",
  voice: "صدای قاری",
  voiceSelectAria: "انتخاب صدای اذان",
  test: "آزمایش",
  stop: "توقف",
  volume: "ولوم",
  adhanForPrayers: "اذان برای این نمازها",
  syncAdhanWithNotify: "همان نمازها مانند یادآورها",
  playAdhanOnNotify: "پخش اذان با یادآور",
  adhanPlaying: "در حال پخش اذان…",
  adhanSeek: "جابه‌جایی در اذان",
  adhanPlaybackFailed:
    "پخش اذان ممکن نشد. اتصال را بررسی کنید یا صدای دیگری انتخاب کنید.",
  adhanPerPrayerTitle: "صدای جداگانه برای هر نماز",
  loadingTimesAria: "در حال بارگذاری اوقات نماز…",
  offlineCachedTimes: "اوقات نماز ذخیره‌شده نمایش داده می‌شود (آفلاین).",
  nextPrayer: "نماز بعدی",
  scheduleHeading: "اوقات نماز",
  footerAttribution: "اوقات نماز: ",
  footerLinkLabel: "اتحادیه اسلامی سوئد",
  footerCreatedBy: "ساخته‌شده توسط RASafi Tech",
  footerCopyright: "© 2026 RASafi Tech. تمام حقوق محفوظ است.",
  footerLegalNavAria: "قانونی و خط‌مشی‌ها",
  privacy: "حریم خصوصی",
  terms: "شرایط",
  cookiesPolicy: "کوکی‌ها",
  disclaimer: "سلب مسئولیت",
  countdownNow: "اکنون",
  countdownHoursShort: "س",
  countdownMinShort: "د",
  countdownSecShort: "ث",
  "errors.selectDate": "تاریخ را انتخاب کنید.",
  "errors.fetchFailed": "بارگذاری اوقات نماز ممکن نشد ({{status}}).",
  "errors.parseFailed": "اوقاتی یافت نشد. نام شهر را بررسی کنید.",
  "errors.cityNotFound":
    "شهر پیدا نشد. نام سوئدی را بنویسید، از فهرست انتخاب کنید یا پس از اتمام تایپ «نمایش اوقات» را بزنید.",
  "errors.generic": "خطایی رخ داد.",
  "prayer.fajr": "فجر",
  "prayer.sunrise": "طلوع",
  "prayer.dhuhr": "ظهر",
  "prayer.asr": "عصر",
  "prayer.maghrib": "مغرب",
  "prayer.isha": "عشاء",
  "prayer.jumuah": "نماز جمعه",
  "prayerSecondary.fajr": "Fajr",
  "prayerSecondary.sunrise": "Sunrise",
  "prayerSecondary.dhuhr": "Dhuhr",
  "prayerSecondary.asr": "Asr",
  "prayerSecondary.maghrib": "Maghrib",
  "prayerSecondary.isha": "Isha",
  "prayerSecondary.jumuah": "نماز جماعت جمعه",
  jumuahHint:
    "مثل ظهر همان روز؛ زمان جماعت در مسجد ممکن است متفاوت باشد.",
  ramadanCardTitle: "ماه رمضان",
  imsakLabel: "إمساک (شروع روزه)",
  iftarLabel: "إفطار (پایان روزه)",
  ramadanCardNote:
    "فجر تقریباً imsak و مغرب تقریباً iftar است؛ در صورت تفاوت با مسجد خود هماهنگ کنید.",
  qiblaTitle: "قبله",
  qiblaGpsHint: "برای جهت به سوی کعبه از موقعیت‌یاب بالا استفاده کنید.",
  qiblaBearing: "قبله: {{deg}}° از شمال",
  hijriCalendarTitle: "تقویم (هجری)",
  hijriSummaryTitle: "تاریخ هجری",
  calPrevMonth: "ماه قبل",
  calNextMonth: "ماه بعد",
  calMonthPagerHint: "با فلش‌ها ماه را عوض کنید.",
  "hijriEvent.ramadanStart": "آغاز ماه رمضان",
  "hijriEvent.laylatQadr": "شب قدر (تقریبی)",
  "hijriEvent.eidFitr": "عید فطر",
  "hijriEvent.arafah": "روز عرفه",
  "hijriEvent.eidAdha": "عید قربان",
  appDownloadBannerTitle: "نصب برنامه",
  appDownloadBannerBody:
    "از مرورگر گزینه «نصب» یا «افزودن به صفحه اصلی» را بزنید — همان وب‌اپ، بدون فروشگاه.",
  appDownloadBannerIosBody:
    "روی آیفون یا آیپد: اشتراک‌گذاری را بزنید، سپس «افزودن به صفحه اصلی».",
  appDownloadBannerInstall: "نصب",
  appDownloadBannerDismiss: "بستن",
  batteryOptimizationHint: "برای اطمینان از اجرای یادآورها در زمان بیکاری گوشی، بهینه‌سازی باتری را برای Prayer Sweden غیرفعال کنید (گزینه 'بدون محدودیت' را انتخاب کنید).",
  batteryOptimizationOpen: "تنظیمات باتری",
  androidSetupTitle: "سه گام برای یادآورهای مطمئن (اندروید)",
  androidSetupIntro:
    "هر دکمه را بزنید و مراحل را دنبال کنید تا اعلان‌ها و اذان حتی در حالت بیکاری پخش شوند.",
  androidSetupStepNotifications: "اعلان‌ها — اجازه نمایش هشدار به برنامه.",
  androidSetupStepExact:
    "زنگ‌های دقیق — برای به‌وقت بودن اوقات نماز لازم است.",
  androidSetupStepBattery: "باتری — نگذارید سیستم برنامه را در پس‌زمینه بخواباند.",
  androidSetupBatteryButton: "باز کردن تنظیمات برنامه و باتری",
  batteryUnrestrictedOk: "باتری: بدون محدودیت ✓",
};

const ku: Messages = {
  skipToContent: "Derbasî naverokê bibe",
  appTitle: "Call to Prayer Sweden",
  tagline:
    "Demên nimêjê ji bo bajarên Swêdê — Yekîtiya Îslamî ya Swêdê.",
  controlsAria: "Bajar û roj",
  disclosureLocationTitle: "Cih, roj û mod",
  mainNavAria: "Navîgasyona sereke",
  tabPrayer: "Demên nimêjê",
  tabPrayerLead:
    "Demên fermî ji bo bajar û roja hilbijartî — nimêja din û plana rojê.",
  tabQibla: "Qible",
  tabQiblaLead:
    "Ber bi Kabeyê ve ji cihê te. GPS û kompas çalak bike heke pêwîst be.",
  tabCalendar: "Salname",
  tabCalendarLead:
    "Salnameya Hicrî, dîtina mehê û girêdana bi roja mîladî ya hilbijartî.",
  tabSettings: "Mîheng",
  settingsSection: "Ziman, ragihandin û ezan",
  city: "Bajar",
  citySelectAria: "Bajêr hilbijêre",
  cityCustom: "Bajarek din (bixweye)",
  cityCustomPlaceholder: "Bajar binivîse ger di nav lîstikê de tune be",
  date: "Roj",
  loadTimes: "Deman nîşan bide",
  loading: "Tê barkirin…",
  language: "Ziman",
  reminders: "Bîranîn",
  remindersHint:
    "Dema nimêjê ragihandin (roja îro). Rûpelê vekirî bihêle heke dikarî.",
  notificationsNativeReliability:
    "Di sepanê de bîranîn pir berê tên plansazîkirin (Android: heta ~60 rojan; iPhone: sînorkirî). Android dikare rojane di paşperdê de nû bike ger bi VITE_API_ORIGIN hatibe avakirin. Destûrê bide ragihandin û alarmên rast; optimîzasyona batterê veke ger dem dereng be.",
  androidExactAlarmsHint:
    "Li Android 12+ sepan ji bo alarmên rast ji bo dema nimêjê destûrê hewce dike.",
  androidExactAlarmsOpen: "Alarmên rast (Android)",
  exactAlarmsGranted: "Alarmên rast: çalak.",
  exactAlarmsDenied: "Alarmên rast: ne çalak — bişkoja bikar bîne û di mîhengên pergalê de destûrê bide.",
  allowNotifications: "Destûrê bide ragihandinan",
  permNotSupported: "Di vê gerokê de nayê piştgirîkirin.",
  permGranted: "Ragihandin çalak in.",
  permDenied: "Asteng kirin — di mîhengên gerokê de biguhere.",
  permDefault: "Hê nehatiye çalakkirin.",
  notifySilent:
    "Bê dengê ragihandinê (ezan hê jî dikare li jêr were lêxistin)",
  adhan: "Ezan",
  adhanHintBefore: "Deng û ast hilbijêre. Bikaranîna",
  adhanHintAfter: "heke cara yekem deng tune be.",
  voice: "Deng",
  voiceSelectAria: "Dengê ezana hilbijêre",
  test: "Test",
  stop: "Rawestîne",
  volume: "Deng",
  adhanForPrayers: "Ezan ji bo van nimêjan",
  syncAdhanWithNotify: "Heman nimêj wek bîranîn",
  playAdhanOnNotify: "Ezan bi bîranînê re bilêxe",
  adhanPlaying: "Ezan tê lêxistin…",
  adhanSeek: "Di ezanê de bigere",
  adhanPlaybackFailed:
    "Ezan nehat lêxistin. Girêdanê kontrol bike an dengek din hilbijêre.",
  adhanPerPrayerTitle: "Deng ji bo her nimêjê",
  loadingTimesAria: "Demên nimêjê tên barkirin…",
  offlineCachedTimes: "Demên nimêjê yên tomarbûyî têne nîşandan (offline).",
  nextPrayer: "Nimêja din",
  scheduleHeading: "Demên nimêjê",
  footerAttribution: "Demên nimêjê: ",
  footerLinkLabel: "Yekîtiya Îslamî ya Swêdê",
  footerCreatedBy: "Ji hêla RASafi Tech ve hatî çêkirin",
  footerCopyright: "© 2026 RASafi Tech. Hemû maf parastî ne.",
  footerLegalNavAria: "Qanûnî û polîtîkayên",
  privacy: "Nepenîtî",
  terms: "Mercên karanînê",
  cookiesPolicy: "Cookies",
  disclaimer: "Bersiv",
  countdownNow: "Niha",
  countdownHoursShort: "s",
  countdownMinShort: "dq",
  countdownSecShort: "ç",
  "errors.selectDate": "Rojekê hilbijêre.",
  "errors.fetchFailed": "Demên nimêjê nehatin barkirin ({{status}}).",
  "errors.parseFailed": "Dem nehatin dîtin. Navê bajarê kontrol bike.",
  "errors.cityNotFound":
    "Bajar nehat dîtin. Navê swêdî bikar bîne, ji lîstikê hilbijêre an piştî nivîsandinê «Deman nîşan bide» bitikîne.",
  "errors.generic": "Çewtiyek derket.",
  "prayer.fajr": "Fecr",
  "prayer.sunrise": "Şerq",
  "prayer.dhuhr": "Nîvro",
  "prayer.asr": "Asr",
  "prayer.maghrib": "Magrib",
  "prayer.isha": "Îşa",
  "prayer.jumuah": "Cuma",
  "prayerSecondary.fajr": "Fajr",
  "prayerSecondary.sunrise": "Sunrise",
  "prayerSecondary.dhuhr": "Dhuhr",
  "prayerSecondary.asr": "Asr",
  "prayerSecondary.maghrib": "Maghrib",
  "prayerSecondary.isha": "Isha",
  "prayerSecondary.jumuah": "Nimêja Cumayê",
  jumuahHint:
    "Di heman dema nîvro de tê nîşandan; dibe ku mizgeft cuda be.",
  ramadanCardTitle: "Remezan",
  imsakLabel: "Îmsak",
  iftarLabel: "Îftar",
  ramadanCardNote:
    "Fecr wek îmsak û magrib wek îftar tên nîşandan; li mizgeftê piştrast bike.",
  qiblaTitle: "Qible",
  qiblaGpsHint: "Ji bo berî Kaaba GPS li jor bikar bîne.",
  qiblaBearing: "Qible: {{deg}}° ji bakur",
  hijriCalendarTitle: "Salname (Hicrî)",
  hijriSummaryTitle: "Roja Hicrî",
  calPrevMonth: "Meha berê",
  calNextMonth: "Meha din",
  calMonthPagerHint: "Mehê bi okan biguherîne.",
  "hijriEvent.ramadanStart": "Destpêka Remezanê",
  "hijriEvent.laylatQadr": "Şeva Qederê (texmînî)",
  "hijriEvent.eidFitr": "Cejna Remezanê",
  "hijriEvent.arafah": "Roja Arefayê",
  "hijriEvent.eidAdha": "Cejna Qurbanê",
  appDownloadBannerTitle: "Sepanê rake",
  appDownloadBannerBody:
    "Sepana gerokê «Rake» an «Li ser ekrana malê zêde bike» — heman malper, bê firotgeh.",
  appDownloadBannerIosBody:
    "Li iPhone an iPad: Parve bike, paşê «Li ser ekrana malê zêde bike».",
  appDownloadBannerInstall: "Rake",
  appDownloadBannerDismiss: "Bigire",
  batteryOptimizationHint: "Ji bo ku bîranîn di dema xewê de bi rasti bixebitin, optimîzasyona batterê ji bo Prayer Sweden bigire (bijara 'Bê sînor' hilbijêre).",
  batteryOptimizationOpen: "Mîhengên batterê",
  androidSetupTitle: "Sê gav ji bo ragihandinên pêbawer (Android)",
  androidSetupIntro:
    "Her bişkojê bikar bîne û ekranê bişopîne. Ev ragihandin û ezan di dema razanê de jî dixebitîne.",
  androidSetupStepNotifications: "Ragihandin — destûrê bide ku sepan alert nîşan bide.",
  androidSetupStepExact:
    "Alarmên rast — ji bo dema rast a nimêjê pêwîst in.",
  androidSetupStepBattery: "Batterê — nehêle pergal sepanê di paşperdê de rawestîne.",
  androidSetupBatteryButton: "Mîhengên sepan û batterê veke",
  batteryUnrestrictedOk: "Batterê: bê sînor ✓",
};

const so: Messages = {
  skipToContent: "U gudub waxyaabaha",
  appTitle: "Call to Prayer Sweden",
  tagline:
    "Waqtiga salaadda magaalooyinka Iswiidhanka — Ururka Islaamka ee Iswiidhanka.",
  controlsAria: "Magaalo iyo taariikh",
  disclosureLocationTitle: "Goobta, taariikhda iyo habka",
  mainNavAria: "Navigashada ugu weyn",
  tabPrayer: "Waqtiga salaadda",
  tabPrayerLead:
    "Waqtiyo rasmiy magaalo iyo taariikhda la doortay — salaadda soo socota iyo jadwalka maanta.",
  tabQibla: "Qibla",
  tabQiblaLead:
    "Jihada xagga Kaaba ee booskaaga. Shid GPS iyo buskud haddii loo baahdo.",
  tabCalendar: "Kalender",
  tabCalendarLead:
    "Jadwalka Hijriga, aragtida bilaha, iyo xiriirka taariikhda Giriigoriyaanka la doortay.",
  tabSettings: "Dejinta",
  settingsSection: "Luqad, ogeysiis iyo adaan",
  city: "Magaalo",
  citySelectAria: "Dooro magaalo",
  cityCustom: "Magaalo kale (ikhtiyaari)",
  cityCustomPlaceholder: "Qor magaalo haddii aan ku jirin liiska",
  date: "Taariikh",
  loadTimes: "Muuji waqtiyada",
  loading: "Waa la soo dejinayaa…",
  language: "Luqadda",
  reminders: "Xusuusin",
  remindersHint:
    "Ogeysiis marka salaaddu tahay (taariikhda maanta). Bogga furo haddii suurtagal tahay.",
  notificationsNativeReliability:
    "Barnaamijka wuxuu xusuusin u qorsheeyaa muddo dheer mustaqbalka (Android ~60 maalmood; iPhone xadidan). Android wuxuu cusboonaysiin karaa maalin walba haddii la dhiso VITE_API_ORIGIN. U oggolow ogeysiisyada iyo digniin sax; ka dami hagaajinta batteriga haddii dib u dhac dhaco.",
  androidExactAlarmsHint:
    "Android 12+ barnaamijka wuxuu u baahan yahay oggolaanshaha digniinta saxda ah ee salaadda.",
  androidExactAlarmsOpen: "Digniin sax (Android)",
  exactAlarmsGranted: "Digniin sax: shid.",
  exactAlarmsDenied: "Digniin sax: dami — badhanka taabo oo ku oggolow dejinta nidaamka.",
  allowNotifications: "U oggolow ogeysiisyada",
  permNotSupported: "Kuma taageero biraawsarkan.",
  permGranted: "Ogeysiisyadu waa shaqeynayaan.",
  permDenied: "Waa la xannibay — beddel browserka.",
  permDefault: "Weli lama shacin.",
  notifySilent:
    "Cod la'aan ogeysiis (adaan wali hoos laga ciyaari karaa)",
  adhan: "Adaan",
  adhanHintBefore: "Dooro cod iyo codka. Isticmaal",
  adhanHintAfter: "haddii aadan maqlin markii ugu horreysay.",
  voice: "Cod",
  voiceSelectAria: "Dooro codka adaan",
  test: "Tijaabi",
  stop: "Jooji",
  volume: "Codka",
  adhanForPrayers: "Adaan salaadahaas",
  syncAdhanWithNotify: "Isla salaadaha xusuusinta",
  playAdhanOnNotify: "Ku ciyaar adaan marka xusuusinta",
  adhanPlaying: "Adaan ayaa la ciyaarayaa…",
  adhanSeek: "Raadi adaan",
  adhanPlaybackFailed:
    "Adaan lama ciyaarin. Hubi xiriirka ama door cod kale.",
  adhanPerPrayerTitle: "Cod kasta salaadda",
  loadingTimesAria: "Waqtiga salaadda waa la soo dejinayaa…",
  offlineCachedTimes: "Waxa la muujinayaa waqtiyada salaadda ee la keydiyay (offline).",
  nextPrayer: "Salaadda xigta",
  scheduleHeading: "Waqtiga salaadda",
  footerAttribution: "Waqtiga salaadda: ",
  footerLinkLabel: "Ururka Islaamka ee Iswiidhanka",
  footerCreatedBy: "Waxaa sameeyay RASafi Tech",
  footerCopyright: "© 2026 RASafi Tech. Dhammaan xuquuqda waa la ilaaliyaa.",
  footerLegalNavAria: "Sharciga iyo siyaasadaha",
  privacy: "Asturnaanta",
  terms: "Shuruudaha",
  cookiesPolicy: "Cookies",
  disclaimer: "Mas'uul ka noqoshada",
  countdownNow: "Hadda",
  countdownHoursShort: "s",
  countdownMinShort: "daq",
  countdownSecShort: "il",
  "errors.selectDate": "Dooro taariikh.",
  "errors.fetchFailed": "Lama soo dejin waqtiga salaadda ({{status}}).",
  "errors.parseFailed": "Waqtiyo lama helin. Hubi magaca magaalada.",
  "errors.cityNotFound":
    "Magaalada lama helin. Magaca Iswiidhishka isticmaal, liiska dooro ama «Muuji waqtiyada» taabo markaad dhammayso.",
  "errors.generic": "Waxbaa qaladay.",
  "prayer.fajr": "Subax",
  "prayer.sunrise": "Qorrax soo bax",
  "prayer.dhuhr": "Qorrax dhexe",
  "prayer.asr": "Casar",
  "prayer.maghrib": "Magrib",
  "prayer.isha": "Cishaa",
  "prayer.jumuah": "Jimcaha",
  "prayerSecondary.fajr": "Fajr",
  "prayerSecondary.sunrise": "Sunrise",
  "prayerSecondary.dhuhr": "Dhuhr",
  "prayerSecondary.asr": "Asr",
  "prayerSecondary.maghrib": "Maghrib",
  "prayerSecondary.isha": "Isha",
  "prayerSecondary.jumuah": "Salaadda Jimcaha",
  jumuahHint:
    "Sida Duhur ee goobta; masaajidu way kala duwanaan karaan.",
  ramadanCardTitle: "Ramadaan",
  imsakLabel: "Imsak",
  iftarLabel: "Iftaar",
  ramadanCardNote:
    "Fajr ≈ imsak, maghrib ≈ iftar; hubi masaajidkaaga haddii ay kala duwan yihiin.",
  qiblaTitle: "Qibla",
  qiblaGpsHint: "Isticmaal GPS kor ku xiga si aad u hesho jihada Kaaba.",
  qiblaBearing: "Qibla: {{deg}}° waqooyi",
  hijriCalendarTitle: "Kalandarka (Hijri)",
  hijriSummaryTitle: "Taariikhda Hijriga",
  calPrevMonth: "Bishii hore",
  calNextMonth: "Bishii xigta",
  calMonthPagerHint: "Ku beddel bilaha falaadhaha.",
  "hijriEvent.ramadanStart": "Bilowga Ramadaanka",
  "hijriEvent.laylatQadr": "Laylatul Qadr (qiyaas)",
  "hijriEvent.eidFitr": "Ciida Fitr",
  "hijriEvent.arafah": "Maalinta Carafo",
  "hijriEvent.eidAdha": "Ciida Adxa",
  appDownloadBannerTitle: "Ku rakib barnaamijka",
  appDownloadBannerBody:
    "Isticmaal «Rakib» ama «Ku dar bogga guriga» ee browserka — isla webka, oo aan Play Store.",
  appDownloadBannerIosBody:
    "iPhone ama iPad: taabo Share, ka dibna Add to Home Screen.",
  appDownloadBannerInstall: "Rakib",
  appDownloadBannerDismiss: "Xir",
  batteryOptimizationHint: "Si aad u hubiso in xusuusintu ay si fiican u shaqeyso marka talefanku nasanayo, dami hagaajinta batteriga ee Prayer Sweden (dooro 'Aan xadidnayn').",
  batteryOptimizationOpen: "Dejinta batteriga",
  androidSetupTitle: "Saddex tallaabo oo digniin lagu hubiyo (Android)",
  androidSetupIntro:
    "Taabo badhanka kasta oo raac shaashadda. Tani waxay u oggolaaneysaa ogeysiis iyo adaan xitaa marka talefanku nasto.",
  androidSetupStepNotifications: "Ogeysiisyada — u oggolow barnaamijka inuu ogeysiis muujiyo.",
  androidSetupStepExact:
    "Digniin sax — loo baahan yahay si waqtiga salaaddu sax u yimaado.",
  androidSetupStepBattery: "Batteriga — ha u oggolaanin nidaamka inuu barnaamijka dhigo mid hurda.",
  androidSetupBatteryButton: "Fur dejinta barnaamijka iyo batteriga",
  batteryUnrestrictedOk: "Batteriga: aan xadidnayn ✓",
};

export const MESSAGES: Record<Locale, Messages> = {
  sv,
  en,
  ar,
  fa,
  ku,
  so,
};