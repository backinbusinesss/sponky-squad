import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:5174/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

// area libera sotto la hero copy
const cx = 720;
const cy = 760;

await page.mouse.move(cx - 300, cy, { steps: 5 });
await page.mouse.move(cx, cy, { steps: 12 });
await page.waitForTimeout(900);
await page.screenshot({ path: "screenshots/cursor-bike-zoom.png", clip: { x: cx - 90, y: cy - 90, width: 180, height: 180 } });

await page.mouse.down();
await page.waitForTimeout(300);
await page.screenshot({ path: "screenshots/cursor-salute-zoom.png", clip: { x: cx - 90, y: cy - 90, width: 180, height: 180 } });
await page.mouse.up();

await browser.close();
console.log("done");
