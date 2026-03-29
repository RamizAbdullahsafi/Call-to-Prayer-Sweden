/**
 * Regenerate src/data/swedishMunicipalities.ts from scripts/wikidata-seats-current.json.
 * Uses Wikidata P36 (administrative seat) for bönetider-friendly place names,
 * with overrides where the seat label is not the usual public name.
 *
 * Fetch fresh JSON (optional):
 * SPARQL: SELECT ?item ?itemLabel ?seatLabel WHERE {
 *   ?item wdt:P31 wd:Q127448 . ?item wdt:P17 wd:Q34 . ?item wdt:P36 ?seat .
 *   FILTER NOT EXISTS { ?item wdt:P576 ?dissolved . }
 *   SERVICE wikibase:label { bd:serviceParam wikibase:language "sv". }
 * } ORDER BY ?itemLabel
 *
 * Run: node scripts/generate-municipalities.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Municipality label (sv) → name used in IF bönetider widget / UI. */
const OVERRIDES = {
  "Ale kommun": "Ale",
  "Region Gotland": "Gotland",
};

/** Wikidata lists two seats (P36) for these; use the usual kommun center name. */
function nameForMultiSeatKommun(itemLabel) {
  const base = itemLabel.replace(/\s+kommun$/i, "").trim();
  const map = {
    Sundbybergs: "Sundbyberg",
    Vaggeryds: "Vaggeryd",
  };
  return map[base] ?? base;
}

const wdPath = path.join(__dirname, "wikidata-seats-current.json");
const data = JSON.parse(fs.readFileSync(wdPath, "utf8"));
const rows = data.results.bindings;

const byItem = new Map();
for (const row of rows) {
  const id = row.item.value;
  if (!byItem.has(id)) byItem.set(id, []);
  byItem.get(id).push({
    itemLabel: row.itemLabel.value,
    seatLabel: row.seatLabel.value,
  });
}

const names = [];
for (const [, group] of byItem) {
  const itemLabel = group[0].itemLabel;
  if (OVERRIDES[itemLabel]) {
    names.push(OVERRIDES[itemLabel]);
    continue;
  }
  if (group.length === 1) {
    names.push(group[0].seatLabel);
    continue;
  }
  names.push(nameForMultiSeatKommun(itemLabel));
}

const sorted = [...names].sort((a, b) => a.localeCompare(b, "sv"));
const unique = [...new Set(sorted)];

if (unique.length !== names.length) {
  const seen = new Map();
  for (const n of names) {
    seen.set(n, (seen.get(n) ?? 0) + 1);
  }
  const dups = [...seen.entries()].filter(([, c]) => c > 1);
  console.warn("Duplicate municipality city names:", dups);
}

if (names.length !== 290) {
  console.warn(`Expected 290 municipalities, got ${names.length}`);
}

const outPath = path.join(__dirname, "..", "src", "data", "swedishMunicipalities.ts");
const out = `/* eslint-disable max-len -- generated list */
/** All 290 Swedish municipalities (kommuner), sorted Swedish A–Ö. Names are administrative seats (Wikidata P36) except a few overrides — aligned with common ort names for Islamiska förbundets bönetider-widget. Regenerate: \`node scripts/generate-municipalities.mjs\` (see scripts/wikidata-seats-current.json). */
export const SWEDISH_MUNICIPALITIES = [
${unique.map((n) => `  ${JSON.stringify(n)},`).join("\n")}
] as const;

export type SwedishMunicipality = (typeof SWEDISH_MUNICIPALITIES)[number];
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, out, "utf8");
console.log(`Wrote ${unique.length} municipalities to ${outPath}`);
