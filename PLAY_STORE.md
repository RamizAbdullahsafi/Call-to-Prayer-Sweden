# Google Play — Call to Prayer Sweden

Den här appen är en **Capacitor**-inpackning av webbappen. Bönetider anropas mot din **Netlify**-URL (samma `/.netlify/functions/bonetider` som på webben).

## Förutsättningar

1. **Google Play-utvecklarkonto** (engångsavgift).
2. **Android Studio** (senaste stabila) med Android SDK.
3. En **publicerad Netlify-URL** (HTTPS), t.ex. `https://din-app.netlify.app`.

## Integritetspolicy (krävs i Play Console)

Efter deploy finns sidan:

`https://<din-netlify-domän>/privacy.html`

Ange denna URL i Play Console under appens butiksprofil / dataskydd.

**Data safety (Play Console):** Fyll i formuläret så att det **överensstämmer** med texten i `privacy.html` (samma datatyper, syften och delning: t.ex. ungefärlig/plats vid användarens val, ort i API-anrop, lokala inställningar, Netlify/IF/Nominatim/Google där det står i policyn). Uppdatera policyn och Data safety vid varje väsentlig ändring av appen.

**Juridiskt:** Texten är skriven för att följa **GDPR** och svensk praxis (t.ex. IMY) i stor utsträckning och för att stödja **Google Play**-krav, men ersätter inte rådgivning från jurist. Vid bolag/organisationsnummer, e-post eller fysisk adress som kontakt — lägg in det i `privacy.html` / `terms.html` och i Play Console.

## Bygga webben för Android

Sätt `VITE_API_ORIGIN` till din Netlify-bas-URL **utan** avslutande snedstreck, bygg och synka:

**Windows (PowerShell):**

```powershell
$env:VITE_API_ORIGIN = "https://din-app.netlify.app"
npm run build
npx cap sync android
```

**macOS / Linux:**

```bash
VITE_API_ORIGIN=https://din-app.netlify.app npm run build
npx cap sync android
```

Lokalt utan variabel används relativa `/api/bonetider` (bra för Netlify/Vite, inte för inbyggd WebView).

## Öppna och signera i Android Studio

```powershell
npm run android:open
```

1. **Build → Generate Signed App Bundle / APK** → välj **Android App Bundle (.aab)**.
2. Skapa eller välj en **upload key** (spara lösenord och keystore säkert).
3. Ladda upp `.aab` i **Play Console → Testing / Production**.

## App-ikoner (PNG)

En enkel upstartikon genereras med:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\generate-icons.ps1
```

Byt gärna ut `public/icon-192.png` och `public/icon-512.png` mot egna bilder innan release, kör sedan `npm run build` och `npx cap sync android`. För Play Store behövs också en **högupplöst** ikon i konsolen (512×512).

## Butiksmaterial (Play Console)

- **Appnamn:** t.ex. Call to Prayer Sweden (kort: Prayer Sweden i `capacitor.config.ts`).
- **Skärmdumpar:** telefon + ev. surfplatta.
- **Funktionsgrafik:** 1024×500 (valfritt).

## Efter uppdatering av webbappen

1. Deploy till Netlify som vanligt.
2. Om du bara ändrat webben behöver du **inte** ny Play-version om WebView laddar samma URL — men denna projekt-setup **kopierar** `dist` in i appen, så för native-uppdateringar: kör `android:sync` igen och ladda upp ny **versionCode** i Play Console.

Öka versionsnummer i `android/app/build.gradle` (`versionCode` / `versionName`) mellan varje uppladdning.

## Hjälp

- [Capacitor Android](https://capacitorjs.com/docs/android)
- [Play Console](https://play.google.com/console)
