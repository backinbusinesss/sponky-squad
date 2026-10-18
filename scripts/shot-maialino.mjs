/**
 * Screenshot of the hero (bike + mascot) from the LOCAL preview build.
 * Usage: node scripts/shot-maialino.mjs <outname> [crop] [zoom]
 *   outname: screenshots/<outname>.png (default maialino)
 *   crop: "x,y,w,h" in CSS px of the 1600x1000 viewport, optional
 *   zoom: integer scale for the crop (default 2)
 */
import { chromium } from "playwright";

const name = process.argv[2] ?? "maialino";
const cropArg = process.argv[3];
const zoom = Number(process.argv[4] ?? 2);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 2,
});
const port = process.env.PORT ?? "4173";
await page.goto(`http://localhost:${port}/`, { waitUntil: "domcontentloaded" });
// attendi il preloader: l'h1 dell'hero compare quando il sito e' pronto
await page.waitForSelector("h1", { timeout: 30000 });
await page.waitForTimeout(2500);

// modalita' "clean": nasconde le card sovrapposte per vedere bene il 3D
if (process.env.CLEAN === "1") {
  await page.evaluate(() => {
    document.querySelectorAll(".glass-panel").forEach((el) => {
      el.style.display = "none";
    });
  });
  await page.waitForTimeout(400);
}

if (cropArg) {
  const [x, y, w, h] = cropArg.split(",").map(Number);
  await page.screenshot({
    path: `screenshots/${name}.png`,
    clip: { x, y, width: w, height: h },
    scale: zoom >= 1 ? "device" : "css",
  });
} else {
  await page.screenshot({ path: `screenshots/${name}.png` });
}

await browser.close();
console.log(`ok -> screenshots/${name}.png`);
