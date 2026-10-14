import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:4173/";
const browser = await chromium.launch();

// desktop full page
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

// misura fps reale durante lo scroll
const fps = await page.evaluate(async () => {
  let frames = 0;
  const start = performance.now();
  const tick = () => {
    frames += 1;
    if (performance.now() - start < 2000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  await new Promise((r) => setTimeout(r, 2200));
  return Math.round((frames / (performance.now() - start)) * 1000);
});
console.log("hero fps:", fps);

for (let i = 0; i < 6; i += 1) {
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(450);
}
await page.waitForTimeout(1200);
await page.screenshot({ path: "screenshots/check-mid.png" });

for (let i = 0; i < 8; i += 1) {
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(400);
}
await page.waitForTimeout(1000);
await page.screenshot({ path: "screenshots/check-low.png" });

console.log("errors:", errors);
await page.close();

// mobile
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await mobile.goto(url, { waitUntil: "networkidle" });
await mobile.waitForTimeout(2500);
const cursorOff = await mobile.evaluate(() => !document.querySelector(".pointer-events-none.fixed"));
console.log("mobile cursor disabled:", cursorOff);
await mobile.screenshot({ path: "screenshots/check-mobile.png" });

await browser.close();
console.log("done");
