import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:5174/";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

const cursorVisible = await page.locator(".pointer-events-none.fixed").count();
console.log("cursor element:", cursorVisible);

// stato base
await page.mouse.move(700, 500);
await page.waitForTimeout(600);
const base = await page.evaluate(() => {
  const c = document.querySelector(".pointer-events-none.fixed");
  return { transform: getComputedStyle(c).transform, filter: getComputedStyle(c).filter };
});
console.log("base:", base);

// hover su CTA
const box = await page.locator('a[href="#iscrizione"]').first().boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
await page.waitForTimeout(700);
const hover = await page.evaluate(() => {
  const c = document.querySelector(".pointer-events-none.fixed");
  return { transform: getComputedStyle(c).transform, filter: getComputedStyle(c).filter };
});
console.log("hover:", hover);

await page.screenshot({ path: "screenshots/cursor-hover.png" });

// click -> saluto a due dita
await page.mouse.down();
await page.waitForTimeout(350);
const pressed = await page.evaluate(() => {
  const c = document.querySelector(".pointer-events-none.fixed");
  const spans = [...c.querySelectorAll(":scope > div > span")].map((s) => ({
    opacity: getComputedStyle(s).opacity,
    transform: getComputedStyle(s).transform,
  }));
  return { spans };
});
console.log("pressed:", pressed);
await page.screenshot({ path: "screenshots/cursor-salute.png" });
await page.mouse.up();

console.log("errors:", errors);
await browser.close();
