import { chromium } from "playwright";

/**
 * Cattura i tre stati del cursore a risoluzione elevata:
 *   1. base    -> moto in appoggio
 *   2. hover   -> moto che impenna (ruota anteriore alzata + fiamma)
 *   3. pressed -> saluto a due dita
 * Ogni clip e' centrata sul punto noto in cui finira il mouse (la molla
 * si assesta in ~600ms), cosi' il cursore e' sempre dentro l'inquadratura.
 * Uso: node scripts/verify-cursor-states.mjs [url]
 */
const url = process.argv[2] ?? "http://localhost:4173/";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 3,
});
const page = await context.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

const clip = (x, y, size = 180) => ({
  x: Math.round(x - size / 2),
  y: Math.round(y - size / 2),
  width: size,
  height: size,
});

const readCursor = () =>
  page.evaluate(() => {
    const c = document.querySelector(".pointer-events-none.fixed");
    if (!c) return { mancante: true };
    const spans = [...c.querySelectorAll(":scope > div > span")];
    const moto = spans[1];
    return {
      motoTransform: moto ? getComputedStyle(moto).transform : null,
      motoOrigine: moto ? getComputedStyle(moto).transformOrigin : null,
      fiamma: Boolean(document.querySelector(".cursor-exhaust")),
      ditaAnim: document.querySelector(".cursor-salute-fingers")
        ? getComputedStyle(document.querySelector(".cursor-salute-fingers")).animationName
        : null,
      glow: getComputedStyle(c).filter,
    };
  });

// ---- 1) stato base: area vuota a sinistra, lontana dagli interattivi ----
const bx = 300;
const by = 862;
await page.mouse.move(bx + 260, by, { steps: 4 });
await page.mouse.move(bx, by, { steps: 14 });
await page.waitForTimeout(900);
await page.screenshot({ path: "screenshots/cursor-1-base.png", clip: clip(bx, by) });
console.log("base:", await readCursor());

// ---- 2) hover su un interattivo -> impennata ----
const box = await page.locator('a[href="#iscrizione"]').first().boundingBox();
const hx = box.x + box.width / 2;
const hy = box.y + box.height / 2;
await page.mouse.move(hx, hy, { steps: 12 });
await page.waitForTimeout(950);
await page.screenshot({ path: "screenshots/cursor-2-hover.png", clip: clip(hx, hy) });
console.log("hover (impennata):", await readCursor());

// ---- 3) click -> saluto a due dita ----
await page.mouse.down();
await page.waitForTimeout(430);
await page.screenshot({ path: "screenshots/cursor-3-salute.png", clip: clip(hx, hy) });
await page.screenshot({ path: "screenshots/cursor-3-salute-tight.png", clip: clip(hx, hy, 116) });
console.log("pressed (saluto):", await readCursor());
await page.mouse.up();

console.log("errori:", errors.length ? errors : "NESSUNO");
await browser.close();
