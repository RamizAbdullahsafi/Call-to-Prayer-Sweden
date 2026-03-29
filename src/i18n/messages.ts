import type { Locale } from "./types";

export type MessageId =
  | "skipToContent"
  | "appTitle"
  | "tagline"
  | "themeAppearance"
  | "themeDay"
  | "themeNight"
  | "themeSystem"
  | "controlsAria"
  | "mainNavAria"
  | "tabPrayer"
  | "tabQibla"
  | "tabCalendar"
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
  | "syncAzanWithNotify"
  | "playAdhanOnNotify"
  | "adhanPlaying"
  | "attribAladhan"
  | "attribCommons"
  | "loadingTimesAria"
  | "nextPrayer"
  | "scheduleHeading"
  | "footerAttribution"
  | "footerLinkLabel"
  | "privacy"
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
  | "calNextMonth";

type Messages = Record<MessageId, string>;

const sv: Messages = {
  skipToContent: "Hoppa till innehåll",
  appTitle: "Call to Prayer Sweden",
  tagline:
    "Bönetider för svenska orter — från Islamiska förbundet i Sverige.",
  themeAppearance: "Utseende",
  themeDay: "Dag",
  themeNight: "Natt",
  themeSystem: "System",
  controlsAria: "Ort och datum",
  mainNavAria: "Huvudnavigering",
  tabPrayer: "Bönetider",
  tabQibla: "Qibla",
  tabCalendar: "Kalender",
  tabSettings: "Inställningar",
  settingsSection: "Språk, utseende, aviseringar och adhan",
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
  allowNotifications: "Tillåt aviseringar",
  permNotSupported: "Stöds inte i den här webbläsaren.",
  permGranted: "Aviseringar är på.",
  permDenied: "Blockerade — ändra under webbläsarens inställningar.",
  permDefault: "Inte aktiverat ännu.",
  notifySilent: "Ingen aviseringspling (adhan kan fortfarande spelas nedan)",
  adhan: "Adhan",
  adhanHintBefore: "Välj röst och volym. Använd",
  adhanHintAfter: "om ljud inte hörs första gången.",
  voice: "Röst",
  voiceSelectAria: "Välj adhan-röst",
  test: "Testa",
  stop: "Stoppa",
  volume: "Volym",
  adhanForPrayers: "Adhan vid dessa böner",
  syncAzanWithNotify: "Samma böner som påminnelser",
  playAdhanOnNotify: "Spela adhan vid påminnelse",
  adhanPlaying: "Adhan spelas…",
  attribAladhan: "Ljud från",
  attribCommons: "och",
  loadingTimesAria: "Laddar bönetider…",
  nextPrayer: "Nästa bön",
  scheduleHeading: "Dagens bönetider",
  footerAttribution: "Bönetider: ",
  footerLinkLabel: "Islamiska förbundet",
  privacy: "Integritet",
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
};

const en: Messages = {
  skipToContent: "Skip to content",
  appTitle: "Call to Prayer Sweden",
  tagline:
    "Prayer times for Swedish locations — from Islamiska förbundet (Islamic Association of Sweden).",
  themeAppearance: "Appearance",
  themeDay: "Day",
  themeNight: "Night",
  themeSystem: "System",
  controlsAria: "Location and date",
  mainNavAria: "Main navigation",
  tabPrayer: "Prayer times",
  tabQibla: "Qibla",
  tabCalendar: "Calendar",
  tabSettings: "Settings",
  settingsSection: "Language, appearance, notifications, and adhan",
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
  allowNotifications: "Allow notifications",
  permNotSupported: "Not supported in this browser.",
  permGranted: "Notifications are on.",
  permDenied: "Blocked — change this in your browser settings.",
  permDefault: "Not enabled yet.",
  notifySilent:
    "No notification sound (adhan can still play below)",
  adhan: "Adhan",
  adhanHintBefore: "Choose voice and volume. Use",
  adhanHintAfter: "if you hear no sound the first time.",
  voice: "Voice",
  voiceSelectAria: "Choose adhan voice",
  test: "Test",
  stop: "Stop",
  volume: "Volume",
  adhanForPrayers: "Adhan for these prayers",
  syncAzanWithNotify: "Same prayers as reminders",
  playAdhanOnNotify: "Play adhan with reminder",
  adhanPlaying: "Playing adhan…",
  attribAladhan: "Audio from",
  attribCommons: "and",
  loadingTimesAria: "Loading prayer times…",
  nextPrayer: "Next prayer",
  scheduleHeading: "Prayer times",
  footerAttribution: "Prayer times: ",
  footerLinkLabel: "Islamiska förbundet",
  privacy: "Privacy",
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
};

const ar: Messages = {
  skipToContent: "تخطي إلى المحتوى",
  appTitle: "Call to Prayer Sweden",
  tagline:
    "أوقات الصلاة للمدن السويدية — من الاتحاد الإسلامي في السويد.",
  themeAppearance: "المظهر",
  themeDay: "نهار",
  themeNight: "ليل",
  themeSystem: "النظام",
  controlsAria: "المدينة والتاريخ",
  mainNavAria: "التنقل الرئيسي",
  tabPrayer: "أوقات الصلاة",
  tabQibla: "القبلة",
  tabCalendar: "التقويم",
  tabSettings: "الإعدادات",
  settingsSection: "اللغة والمظهر والإشعارات والأذان",
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
  syncAzanWithNotify: "نفس الصلوات كالتذكيرات",
  playAdhanOnNotify: "تشغيل الأذان مع التذكير",
  adhanPlaying: "جارٍ تشغيل الأذان…",
  attribAladhan: "صوت من",
  attribCommons: "و",
  loadingTimesAria: "جارٍ تحميل أوقات الصلاة…",
  nextPrayer: "الصلاة التالية",
  scheduleHeading: "أوقات الصلاة",
  footerAttribution: "أوقات الصلاة: ",
  footerLinkLabel: "الاتحاد الإسلامي في السويد",
  privacy: "الخصوصية",
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
};

const fa: Messages = {
  skipToContent: "پرش به محتوا",
  appTitle: "Call to Prayer Sweden",
  tagline:
    "اوقات نماز برای شهرهای سوئد — از اتحادیه اسلامی سوئد.",
  themeAppearance: "ظاهر",
  themeDay: "روز",
  themeNight: "شب",
  themeSystem: "سیستم",
  controlsAria: "شهر و تاریخ",
  mainNavAria: "ناوبری اصلی",
  tabPrayer: "اوقات نماز",
  tabQibla: "قبله",
  tabCalendar: "تقویم",
  tabSettings: "تنظیمات",
  settingsSection: "زبان، ظاهر، اعلان‌ها و اذان",
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
  syncAzanWithNotify: "همان نمازها مانند یادآورها",
  playAdhanOnNotify: "پخش اذان با یادآور",
  adhanPlaying: "در حال پخش اذان…",
  attribAladhan: "صدا از",
  attribCommons: "و",
  loadingTimesAria: "در حال بارگذاری اوقات نماز…",
  nextPrayer: "نماز بعدی",
  scheduleHeading: "اوقات نماز",
  footerAttribution: "اوقات نماز: ",
  footerLinkLabel: "اتحادیه اسلامی سوئد",
  privacy: "حریم خصوصی",
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
};

// Fix typo in fa - I duplicated errors.generic
// Remove the wrong key "errors.generic:" 

const ku: Messages = {
  skipToContent: "Derbasî naverokê bibe",
  appTitle: "Call to Prayer Sweden",
  tagline:
    "Demên nimêjê ji bo bajarên Swêdê — Yekîtiya Îslamî ya Swêdê.",
  themeAppearance: "Xuyang",
  themeDay: "Roj",
  themeNight: "Şev",
  themeSystem: "Sîstem",
  controlsAria: "Bajar û roj",
  mainNavAria: "Navîgasyona sereke",
  tabPrayer: "Demên nimêjê",
  tabQibla: "Qible",
  tabCalendar: "Salname",
  tabSettings: "Mîheng",
  settingsSection: "Ziman, xuyang, ragihandin û ezan",
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
  syncAzanWithNotify: "Heman nimêj wek bîranîn",
  playAdhanOnNotify: "Ezan bi bîranînê re bilêxe",
  adhanPlaying: "Ezan tê lêxistin…",
  attribAladhan: "Deng ji",
  attribCommons: "û",
  loadingTimesAria: "Demên nimêjê tên barkirin…",
  nextPrayer: "Nimêja din",
  scheduleHeading: "Demên nimêjê",
  footerAttribution: "Demên nimêjê: ",
  footerLinkLabel: "Yekîtiya Îslamî ya Swêdê",
  privacy: "Nepenîtî",
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
};

const so: Messages = {
  skipToContent: "U gudub waxyaabaha",
  appTitle: "Call to Prayer Sweden",
  tagline:
    "Waqtiga salaadda magaalooyinka Iswiidhanka — Ururka Islaamka ee Iswiidhanka.",
  themeAppearance: "Muuqaalka",
  themeDay: "Maalin",
  themeNight: "Habeen",
  themeSystem: "Nidaamka",
  controlsAria: "Magaalo iyo taariikh",
  mainNavAria: "Navigashada ugu weyn",
  tabPrayer: "Waqtiga salaadda",
  tabQibla: "Qibla",
  tabCalendar: "Kalender",
  tabSettings: "Dejinta",
  settingsSection: "Luqad, muuqaal, ogeysiis iyo adaan",
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
  syncAzanWithNotify: "Isla salaadaha xusuusinta",
  playAdhanOnNotify: "Ku ciyaar adaan marka xusuusinta",
  adhanPlaying: "Adaan ayaa la ciyaarayaa…",
  attribAladhan: "Cod ka yimid",
  attribCommons: "iyo",
  loadingTimesAria: "Waqtiga salaadda waa la soo dejinayaa…",
  nextPrayer: "Salaadda xigta",
  scheduleHeading: "Waqtiga salaadda",
  footerAttribution: "Waqtiga salaadda: ",
  footerLinkLabel: "Ururka Islaamka ee Iswiidhanka",
  privacy: "Asturnaanta",
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
};

export const MESSAGES: Record<Locale, Messages> = {
  sv,
  en,
  ar,
  fa,
  ku,
  so,
};