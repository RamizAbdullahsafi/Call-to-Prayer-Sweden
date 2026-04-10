/**
 * Downloads bundled azan files into public/audio and copies to android res/raw.
 * Run after changing the file list: node scripts/fetch-azan-audio.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const publicAudio = path.join(root, "public", "audio");
const rawDir = path.join(root, "android", "app", "src", "main", "res", "raw");

/** Filenames must match Android raw naming: [a-z0-9_.]+ */
const FILES = [
  {
    file: "mishary_dubai.mp3",
    url: "https://cdn.aladhan.com/audio/adhans/a4.mp3",
  },
  {
    file: "mishary_yet_another.mp3",
    url: "https://cdn.aladhan.com/audio/adhans/a9.mp3",
  },
  {
    file: "mishary_alt.mp3",
    url: "https://cdn.aladhan.com/audio/adhans/a7.mp3",
  },
  {
    file: "ahmad_nafees.mp3",
    url: "https://cdn.aladhan.com/audio/adhans/a1.mp3",
  },
  {
    file: "mustafa_ozcan.mp3",
    url: "https://cdn.aladhan.com/audio/adhans/a2.mp3",
  },
  {
    file: "karl_jenkins.mp3",
    url: "https://cdn.aladhan.com/audio/adhans/a3.mp3",
  },
  {
    file: "mansour_zahrani.mp3",
    url: "https://cdn.aladhan.com/audio/adhans/a11-mansour-al-zahrani.mp3",
  },
  {
    file: "sabah_fakhry.mp3",
    url: "https://upload.wikimedia.org/wikipedia/commons/2/27/Call_to_prayer_by_Sabah_Fakhry.mp3",
  },
  {
    file: "beautiful_adhan.ogg",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/b0/Beautiful_adhan.ogg",
  },
  {
    file: "adhan_classic.ogg",
    url: "https://upload.wikimedia.org/wikipedia/commons/8/86/Azan.ogg",
  },
  {
    file: "islamic_call_worship.oga",
    url: "https://upload.wikimedia.org/wikipedia/commons/d/d2/Islamic_call_to_worship.oga",
  },
  {
    file: "aaqib_azeez.mp3",
    url: "https://upload.wikimedia.org/wikipedia/commons/7/7d/The_Adhan_-_Muslim_Call_to_Prayer_-_Aaqib_Azeez.mp3",
  },
];

async function download(url, dest) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "CallToPrayerSweden/1.0 (azan bundle; +https://github.com/RamizAbdullahsafi/Call-to-Prayer-Sweden)",
    },
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
}

async function main() {
  fs.mkdirSync(publicAudio, { recursive: true });
  fs.mkdirSync(rawDir, { recursive: true });

  for (const { file, url } of FILES) {
    const pubPath = path.join(publicAudio, file);
    const rawPath = path.join(rawDir, file);
    process.stdout.write(`Fetching ${file}… `);
    await download(url, pubPath);
    fs.copyFileSync(pubPath, rawPath);
    const stat = fs.statSync(pubPath);
    console.log(`${(stat.size / 1024).toFixed(1)} KiB`);
  }

  for (const orphan of ["bundled-adhan.ogg", "bundled_adhan.ogg"]) {
    const p = path.join(publicAudio, orphan);
    const r = path.join(rawDir, orphan.replace(/-/g, "_"));
    try {
      fs.unlinkSync(p);
    } catch {
      /* ignore */
    }
    try {
      fs.unlinkSync(r);
    } catch {
      /* ignore */
    }
  }

  console.log("Done. public/audio + android res/raw updated.");
}

await main();
