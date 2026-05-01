import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const checks = [];

function read(filePath) {
  return fs.readFileSync(path.join(root, filePath), "utf8");
}

function exists(filePath) {
  return fs.existsSync(path.join(root, filePath));
}

function ok(name, details) {
  checks.push({ level: "PASS", name, details });
}

function warn(name, details) {
  checks.push({ level: "WARN", name, details });
}

function fail(name, details) {
  checks.push({ level: "FAIL", name, details });
}

function hasRegex(content, regex) {
  return regex.test(content);
}

function parseNumberFromGradle(content, key) {
  const re = new RegExp(`${key}\\s*=\\s*(\\d+)`);
  const m = content.match(re);
  return m ? Number(m[1]) : null;
}

function run() {
  const variablesGradle = "android/variables.gradle";
  const appBuildGradle = "android/app/build.gradle";
  const manifestPath = "android/app/src/main/AndroidManifest.xml";
  const capacitorConfigPath = "capacitor.config.ts";
  const gitignorePath = ".gitignore";
  const privacySvPath = "public/privacy.html";
  const privacyEnPath = "public/en/privacy.html";
  const termsEnPath = "public/en/terms.html";

  if (!exists(variablesGradle)) fail("Android SDK config", `${variablesGradle} not found.`);
  if (!exists(appBuildGradle)) fail("Android app build", `${appBuildGradle} not found.`);
  if (!exists(manifestPath)) fail("Android manifest", `${manifestPath} not found.`);
  if (!exists(capacitorConfigPath)) fail("Capacitor config", `${capacitorConfigPath} not found.`);
  if (!exists(gitignorePath)) fail("Gitignore", `${gitignorePath} not found.`);
  if (!exists(privacySvPath)) warn("Swedish privacy policy", `${privacySvPath} not found.`);
  if (!exists(privacyEnPath)) warn("English privacy policy", `${privacyEnPath} not found.`);
  if (!exists(termsEnPath)) warn("English terms", `${termsEnPath} not found.`);

  if (checks.some((c) => c.level === "FAIL")) return;

  const variables = read(variablesGradle);
  const appBuild = read(appBuildGradle);
  const manifest = read(manifestPath);
  const capacitorConfig = read(capacitorConfigPath);
  const gitignore = read(gitignorePath);
  const privacySv = exists(privacySvPath) ? read(privacySvPath) : "";
  const privacyEn = exists(privacyEnPath) ? read(privacyEnPath) : "";
  const termsEn = exists(termsEnPath) ? read(termsEnPath) : "";

  const compileSdk = parseNumberFromGradle(variables, "compileSdkVersion");
  const targetSdk = parseNumberFromGradle(variables, "targetSdkVersion");

  if (compileSdk !== null && compileSdk >= 36) {
    ok("Compile SDK", `compileSdkVersion=${compileSdk}`);
  } else {
    fail("Compile SDK", "compileSdkVersion should be >= 36 for current Play requirements.");
  }

  if (targetSdk !== null && targetSdk >= 36) {
    ok("Target SDK", `targetSdkVersion=${targetSdk}`);
  } else {
    fail("Target SDK", "targetSdkVersion should be >= 36 for new Play submissions.");
  }

  if (
    hasRegex(appBuild, /minifyEnabled\s+true/) &&
    hasRegex(appBuild, /shrinkResources\s+true/)
  ) {
    ok("Release optimization", "R8 minification and resource shrinking are enabled.");
  } else {
    warn(
      "Release optimization",
      "Recommended: enable minifyEnabled true and shrinkResources true in release build."
    );
  }

  if (hasRegex(appBuild, /signingConfig\s+signingConfigs\.release/)) {
    ok("Release signing wiring", "Release build points to release signingConfig.");
  } else {
    fail("Release signing wiring", "Release build is not using signingConfigs.release.");
  }

  const requiredPermissions = [
    "android.permission.POST_NOTIFICATIONS",
    "android.permission.SCHEDULE_EXACT_ALARM",
    "android.permission.USE_EXACT_ALARM",
    "android.permission.FOREGROUND_SERVICE",
    "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
  ];
  const missingPermissions = requiredPermissions.filter(
    (perm) => !hasRegex(manifest, new RegExp(perm.replaceAll(".", "\\.")))
  );
  if (missingPermissions.length === 0) {
    ok("Android permissions", "Required permissions for reminders/azan are declared.");
  } else {
    fail(
      "Android permissions",
      `Missing permissions: ${missingPermissions.join(", ")}`
    );
  }

  if (
    hasRegex(
      manifest,
      /com\.google\.firebase\.messaging\.default_notification_icon/
    ) &&
    hasRegex(manifest, /@drawable\/ic_stat_prayer_bell/)
  ) {
    ok("Default notification icon", "Manifest default notification icon uses bell resource.");
  } else {
    warn(
      "Default notification icon",
      "Expected manifest metadata for default_notification_icon with ic_stat_prayer_bell."
    );
  }

  if (hasRegex(capacitorConfig, /smallIcon:\s*"ic_stat_prayer_bell"/)) {
    ok("Capacitor notification icon", "LocalNotifications.smallIcon uses ic_stat_prayer_bell.");
  } else {
    warn(
      "Capacitor notification icon",
      "Expected LocalNotifications.smallIcon to be ic_stat_prayer_bell."
    );
  }

  const iconFiles = [
    "android/app/src/main/res/drawable/ic_stat_prayer_bell.png",
    "android/app/src/main/res/drawable-mdpi/ic_stat_prayer_bell.png",
    "android/app/src/main/res/drawable-hdpi/ic_stat_prayer_bell.png",
    "android/app/src/main/res/drawable-xhdpi/ic_stat_prayer_bell.png",
    "android/app/src/main/res/drawable-xxhdpi/ic_stat_prayer_bell.png",
    "android/app/src/main/res/drawable-xxxhdpi/ic_stat_prayer_bell.png",
  ];
  const missingIconFiles = iconFiles.filter((p) => !exists(p));
  if (missingIconFiles.length === 0) {
    ok("Notification icon assets", "Bell icon exists in all targeted drawable densities.");
  } else {
    fail("Notification icon assets", `Missing files: ${missingIconFiles.join(", ")}`);
  }

  if (hasRegex(gitignore, /android\/keystore\.properties/) && hasRegex(gitignore, /android\/app\/\*\.jks/)) {
    ok("Secret hygiene", "Keystore files are ignored in git.");
  } else {
    warn("Secret hygiene", "Ensure keystore files are ignored in .gitignore.");
  }

  if (exists("android/keystore.properties.example")) {
    ok("Keystore template", "Found android/keystore.properties.example.");
  } else {
    warn(
      "Keystore template",
      "Recommended: include android/keystore.properties.example for release onboarding."
    );
  }

  const privacyCombined = `${privacySv}\n${privacyEn}`;
  if (
    hasRegex(privacyCombined, /Data safety/i) &&
    hasRegex(privacyCombined, /exact alarms|exakta larm/i)
  ) {
    ok("Privacy policy coverage", "Privacy pages mention Data safety and exact alarms.");
  } else {
    warn(
      "Privacy policy coverage",
      "Ensure privacy pages explicitly cover Data safety fields and exact alarms usage."
    );
  }

  if (hasRegex(termsEn, /Google Play/i)) {
    ok("Terms coverage", "Terms page references Google Play.");
  } else {
    warn("Terms coverage", "Recommended: mention Google Play terms in terms page.");
  }
}

run();

const byLevel = { FAIL: 0, WARN: 1, PASS: 2 };
checks.sort((a, b) => byLevel[a.level] - byLevel[b.level]);

for (const c of checks) {
  const prefix = c.level === "PASS" ? "✓" : c.level === "WARN" ? "!" : "✗";
  console.log(`${prefix} [${c.level}] ${c.name}: ${c.details}`);
}

const failCount = checks.filter((c) => c.level === "FAIL").length;
const warnCount = checks.filter((c) => c.level === "WARN").length;
const passCount = checks.filter((c) => c.level === "PASS").length;

console.log(
  `\nPlay Store readiness summary: ${passCount} pass, ${warnCount} warn, ${failCount} fail`
);

if (failCount > 0) {
  process.exitCode = 1;
}
