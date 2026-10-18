/**
 * Screenshot of an arbitrary section of the LOCAL preview build.
 * Usage: node scripts/shot-section.mjs <outname> <css-selector>
 *   outname: screenshots/<outname>.png
 *   css-selector: the section to scroll into view before shooting
 * Also fails loudly on console errors, so a broken section is caught here.
 */
import { chromium } from "playwright";

const name = process.argv[2] ?? "section";
const selector = process.argv[3];

if (!selector) {
  console.error("usage: node scripts/shot-section.mjs <outname> <css-selector>");
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 2,
});

const problems = [];
page.on("console", (msg) => {
  if (msg.type() === "error") problems.push(`console: ${msg.text()}`);
});
page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));

const port = process.env.PORT ?? "4173";
await page.goto(`http://localhost:${port}/`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("h1", { timeout: 30000 });
await page.waitForTimeout(1500);

const target = page.locator(selector).first();
await target.scrollIntoViewIfNeeded();
await page.waitForTimeout(1800);

await target.screenshot({ path: `screenshots/${name}.png` });

await browser.close();

if (problems.length > 0) {
  console.log("PROBLEMS:");
  for (const line of problems) console.log(`  ${line}`);
} else {
  console.log("no console/page errors");
}
console.log(`ok -> screenshots/${name}.png`);
