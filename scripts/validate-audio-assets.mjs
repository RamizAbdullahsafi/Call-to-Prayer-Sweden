import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd());
const azanFile = resolve(repoRoot, "src/azan.ts");
const capacitorConfigFile = resolve(repoRoot, "capacitor.config.ts");
const androidRawDir = resolve(repoRoot, "android/app/src/main/res/raw");
const publicAudioDir = resolve(repoRoot, "public/audio");

function die(msg) {
  console.error(`\n[validate:assets] ${msg}\n`);
  process.exit(1);
}

if (!existsSync(azanFile)) die("Missing src/azan.ts");
if (!existsSync(capacitorConfigFile)) die("Missing capacitor.config.ts");

const azanSrc = readFileSync(azanFile, "utf8");
const configSrc = readFileSync(capacitorConfigFile, "utf8");

const offlineFiles = new Set();
for (const match of azanSrc.matchAll(/offlineFile:\s*"([^"]+)"/g)) {
  offlineFiles.add(match[1]);
}
for (const match of azanSrc.matchAll(/iosFallbackFile:\s*"([^"]+)"/g)) {
  offlineFiles.add(match[1]);
}
if (offlineFiles.size === 0) {
  die("No offlineFile entries found in src/azan.ts");
}

const localNotificationsBlockMatch = configSrc.match(
  /LocalNotifications:\s*\{([\s\S]*?)\}\s*,?/m
);
const soundMatch = localNotificationsBlockMatch?.[1]?.match(/sound:\s*"([^"]+)"/);
const notificationSound = soundMatch?.[1] ?? null;

const missingPublic = [];
for (const file of offlineFiles) {
  const p = resolve(publicAudioDir, file);
  if (!existsSync(p)) missingPublic.push(`public/audio/${file}`);
}

const rawRequired = new Set(offlineFiles);
if (notificationSound && notificationSound !== "default") {
  rawRequired.add(notificationSound);
}
const missingAndroidRaw = [];
for (const file of rawRequired) {
  const p = resolve(androidRawDir, file);
  if (!existsSync(p)) missingAndroidRaw.push(`android/app/src/main/res/raw/${file}`);
}

if (missingPublic.length || missingAndroidRaw.length) {
  const lines = [];
  if (missingPublic.length) {
    lines.push("Missing bundled web audio files:");
    lines.push(...missingPublic.map((x) => `  - ${x}`));
  }
  if (missingAndroidRaw.length) {
    lines.push("Missing Android raw audio files:");
    lines.push(...missingAndroidRaw.map((x) => `  - ${x}`));
  }
  die(lines.join("\n"));
}

console.log(
  `[validate:assets] OK (${offlineFiles.size} voice files + notification sound ${
    notificationSound ?? "default"
  })`
);
