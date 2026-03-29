import fs from "node:fs/promises";

const SOURCE_FILE = "src/data/swedishMunicipalities.ts";
const OUTPUT_FILE = "src/data/swedishMunicipalities.ts";
const REPORT_FILE = "scripts/unsupported-cities.json";
const WIDGET_URL =
  "https://www.islamiskaforbundet.se/wp-content/plugins/bonetider/Bonetider_Widget.php";

function parseCitiesFromTs(tsContent) {
  const matches = [...tsContent.matchAll(/"([^"]+)"/g)];
  const all = matches.map((m) => m[1]);
  return [...new Set(all)];
}

function hasUsableTimes(html) {
  if (!html || !/<li\b/i.test(html)) return false;
  return (html.match(/\d{2}:\d{2}/g) ?? []).length >= 6;
}

function renderTs(cities) {
  const sorted = [...cities].sort((a, b) => a.localeCompare(b, "sv"));
  return `/* eslint-disable max-len -- generated list */
/** Municipalities verified against Islamiska förbundets bönetider-widget. */
export const SWEDISH_MUNICIPALITIES = [
${sorted.map((c) => `  "${c}",`).join("\n")}
];
`;
}

async function main() {
  const tsContent = await fs.readFile(SOURCE_FILE, "utf8");
  const cities = parseCitiesFromTs(tsContent);
  const date = new Date().toISOString().slice(0, 10);

  const supported = [];
  const unsupported = [];

  for (const city of cities) {
    try {
      const body = new URLSearchParams({
        ifis_bonetider_widget_city: `${city}, SE`,
        ifis_bonetider_widget_date: date,
      }).toString();

      const res = await fetch(WIDGET_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        },
        body,
      });

      const html = await res.text();
      if (res.ok && hasUsableTimes(html)) supported.push(city);
      else unsupported.push(city);
    } catch {
      unsupported.push(city);
    }

    await new Promise((r) => setTimeout(r, 120));
  }

  await fs.writeFile(OUTPUT_FILE, renderTs(supported), "utf8");
  await fs.writeFile(
    REPORT_FILE,
    JSON.stringify(
      {
        date,
        total: cities.length,
        supported: supported.length,
        unsupported: unsupported.length,
        unsupportedCities: unsupported.sort((a, b) => a.localeCompare(b, "sv")),
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(
    `Verified ${cities.length} cities. Supported: ${supported.length}, unsupported: ${unsupported.length}.`
  );
}

await main();
