/**
 * Rasterizes public/icon.svg to icon-192.png and icon-512.png (same artwork as Android adaptive icon).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicDir = join(root, "public");
const svgPath = join(publicDir, "icon.svg");
const svg = readFileSync(svgPath);

await sharp(svg).resize(192, 192).png().toFile(join(publicDir, "icon-192.png"));
await sharp(svg).resize(512, 512).png().toFile(join(publicDir, "icon-512.png"));

console.log("Wrote public/icon-192.png and public/icon-512.png from icon.svg");
