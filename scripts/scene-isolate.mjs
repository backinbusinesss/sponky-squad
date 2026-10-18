import { chromium } from "playwright";

/** Isola il canvas 3D: nasconde i layer di testo e scatta solo la scena. */
const url = process.argv[2] ?? "http://localhost:4173/";
const width = Number(process.argv[3] ?? 1440);
const height = Number(process.argv[4] ?? 900);
const out = process.argv[5] ?? "screenshots/scene-isolated.png";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(3500);

const info = await page.evaluate(() => {
  const perf = performance
    .getEntriesByType("resource")
    .map((r) => r.name)
    .filter((n) => n.includes(".glb"));
  const canvas = document.querySelector("canvas");
  return { glb: perf, canvas: canvas ? { w: canvas.width, h: canvas.height } : null };
});
console.log("glb richiesti:", info.glb.length ? info.glb : "NESSUNO");
console.log("canvas:", info.canvas);

// nasconde tutto tranne il canvas
await page.addStyleTag({
  content: `
    section > div:not(:has(canvas)) { opacity: 0 !important; }
    header, nav { opacity: 0 !important; }
  `,
});
await page.waitForTimeout(1200);
await page.screenshot({ path: out });

await browser.close();
console.log("scatto:", out);
