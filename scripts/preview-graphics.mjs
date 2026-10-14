import fs from "node:fs";
import { chromium } from "playwright";

const files = [
  "community-night-ride.svg",
  "community-track-day.svg",
  "community-meet.svg",
  "community-road.svg",
];

const cards = files
  .map(
    (f) =>
      `<div style="width:330px;height:412px;border-radius:12px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.6)"><img src="/assets/${f}" style="width:100%;height:100%;object-fit:cover"></div>`,
  )
  .join("");

const html = `<!doctype html><html><head><meta charset="utf-8"></head>
<body style="margin:0;background:#050507;padding:24px;display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start">
${cards}
<div style="width:740px;height:470px;border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.6)"><img src="/assets/italy-map.svg" style="width:100%;height:100%;object-fit:cover"></div>
</body></html>`;

fs.writeFileSync("public/graphics-preview.html", html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1460, height: 960 } });
await page.goto("http://localhost:4173/graphics-preview.html", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({ path: "screenshots/graphics-check.png", fullPage: true });
await browser.close();
console.log("done");
