/**
 * PWA + Android adaptive foreground from:
 *   1) public/icon-source.png — preferred (e.g. export from Canva, 1024×1024)
 *   2) public/icon.svg — fallback
 *
 * Android: foreground image is cover-cropped into ~94% of the 108dp layer so the
 * artwork fills the launcher mask (Canva exports with empty margins no longer look tiny).
 * Removes vector XML with the same name so Gradle does not see duplicate resources.
 */
import { existsSync, mkdirSync, readFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicDir = join(root, "public");
const androidRes = join(root, "android", "app", "src", "main", "res");

const PNG_SOURCE = join(publicDir, "icon-source.png");
const SVG_SOURCE = join(publicDir, "icon.svg");

/** Adaptive icon foreground layer sizes (dp → px at each density, 108dp base). */
const FG_BY_QUALIFIER = {
  mdpi: 108,
  hdpi: 162,
  xhdpi: 216,
  xxhdpi: 324,
  xxxhdpi: 432,
};

/**
 * Artwork is resized with cover to this edge length (fraction of the 108dp layer).
 * Higher = larger on the home screen; ~0.94 is strong fill; OEM circle masks may shave corners slightly.
 */
const ADAPTIVE_ART_FRACTION = 0.94;

const VECTOR_FILES_TO_REMOVE = [
  join(androidRes, "drawable", "ic_masjid_foreground.xml"),
  join(androidRes, "drawable-v24", "ic_launcher_foreground.xml"),
];

async function adaptiveForegroundPng(inputBuffer, sizePx) {
  const innerPx = Math.round(sizePx * ADAPTIVE_ART_FRACTION);
  const tile = await sharp(inputBuffer)
    .resize(innerPx, innerPx, {
      fit: "cover",
      position: "centre",
    })
    .ensureAlpha()
    .png()
    .toBuffer();

  const left = Math.max(0, Math.round((sizePx - innerPx) / 2));
  const top = Math.max(0, Math.round((sizePx - innerPx) / 2));

  return sharp({
    create: {
      width: sizePx,
      height: sizePx,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: tile, left, top }])
    .png()
    .toBuffer();
}

function resolveInput() {
  if (existsSync(PNG_SOURCE)) {
    return { buffer: readFileSync(PNG_SOURCE), label: "icon-source.png" };
  }
  if (existsSync(SVG_SOURCE)) {
    return { buffer: readFileSync(SVG_SOURCE), label: "icon.svg" };
  }
  throw new Error(
    "Add public/icon-source.png (your Canva export) or keep public/icon.svg."
  );
}

function removeConflictingVectors() {
  for (const p of VECTOR_FILES_TO_REMOVE) {
    try {
      if (existsSync(p)) unlinkSync(p);
    } catch {
      /* ignore */
    }
  }
}

async function main() {
  const { buffer, label } = resolveInput();

  /** Fill square PWA tiles (crop excess empty canvas from exports like Canva). */
  const pwaResize = { fit: "cover", position: "centre" };
  await sharp(buffer)
    .resize(192, 192, pwaResize)
    .png()
    .toFile(join(publicDir, "icon-192.png"));
  await sharp(buffer)
    .resize(512, 512, pwaResize)
    .png()
    .toFile(join(publicDir, "icon-512.png"));
  console.log(`Wrote public/icon-192.png and public/icon-512.png from ${label}`);

  removeConflictingVectors();

  for (const [qualifier, sizePx] of Object.entries(FG_BY_QUALIFIER)) {
    const dir = join(androidRes, `drawable-${qualifier}`);
    mkdirSync(dir, { recursive: true });
    const out = await adaptiveForegroundPng(buffer, sizePx);
    await sharp(out).toFile(join(dir, "ic_masjid_foreground.png"));
  }
  console.log(
    "Wrote Android drawable-*/ic_masjid_foreground.png (adaptive foreground)."
  );
  console.log(
    "Tip: export your Canva design as PNG and save as public/icon-source.png, then run: npm run icons"
  );
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
