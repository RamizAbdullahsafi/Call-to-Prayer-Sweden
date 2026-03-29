/**
 * Writes a tiny WAV (notification-style chime) into android res/raw for
 * Android 8+ notification channels (custom sound).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "android", "app", "src", "main", "res", "raw");
const outFile = path.join(outDir, "adhan_notify.wav");

const sampleRate = 22050;
const durationSec = 0.45;
const freq = 523.25;
const numSamples = Math.floor(sampleRate * durationSec);
const dataSize = numSamples * 2;
const fileSize = 44 + dataSize - 8;

fs.mkdirSync(outDir, { recursive: true });

const buf = Buffer.alloc(44 + dataSize);
let o = 0;
buf.write("RIFF", o);
o += 4;
buf.writeUInt32LE(36 + dataSize, o);
o += 4;
buf.write("WAVE", o);
o += 4;
buf.write("fmt ", o);
o += 4;
buf.writeUInt32LE(16, o);
o += 4;
buf.writeUInt16LE(1, o);
o += 2;
buf.writeUInt16LE(1, o);
o += 2;
buf.writeUInt32LE(sampleRate, o);
o += 4;
buf.writeUInt32LE(sampleRate * 2, o);
o += 4;
buf.writeUInt16LE(2, o);
o += 2;
buf.writeUInt16LE(16, o);
o += 2;
buf.write("data", o);
o += 4;
buf.writeUInt32LE(dataSize, o);
o += 4;

for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  const env = Math.min(1, i / 800) * Math.max(0, 1 - (i - numSamples * 0.7) / (numSamples * 0.3));
  const s = Math.sin(2 * Math.PI * freq * t) * env * 0.35;
  const v = Math.max(-1, Math.min(1, s));
  buf.writeInt16LE(Math.round(v * 32767), o);
  o += 2;
}

fs.writeFileSync(outFile, buf);
console.log("Wrote", outFile, `(${buf.length} bytes)`);
