/* Verifica del selettore copertine e dello stato "premuto" del cursore.
   Punta al preview locale, non al sito live. */
import fs from "node:fs";
import { chromium } from "playwright";

const BASE = "http://localhost:4173/";
const OUT = "screenshots";
fs.mkdirSync(OUT, { recursive: true });

const issues = [];
const note = (cat, msg) => issues.push(`[${cat}] ${msg}`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

page.on("console", (m) => m.type() === "error" && note("console", m.text().slice(0, 180)));
page.on("pageerror", (e) => note("pageerror", String(e.message).slice(0, 180)));
page.on("response", (r) => r.status() >= 400 && note("http", `${r.status()} ${r.url()}`));

await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.locator("h1").first().waitFor({ state: "visible", timeout: 20000 });
await page.waitForTimeout(3500);

await page.locator("#eventi").scrollIntoViewIfNeeded();
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}\\p-01-eventi.png` });

const coverBefore = await page
  .locator("#eventi img[alt^='Copertina evento']")
  .first()
  .getAttribute("src");
console.log("copertina iniziale:", coverBefore);

// apri il selettore
const openBtn = page.getByRole("button", { name: /scegli grafica/i });
await openBtn.waitFor({ state: "visible", timeout: 10000 });
await openBtn.click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}\\p-02-picker-aperto.png` });

const thumbCount = await page.locator("#eventi button[aria-pressed]").count();
console.log("miniature nel grigliotto:", thumbCount);
if (thumbCount < 50) note("picker", `attese 52 miniature, trovate ${thumbCount}`);

// filtro per palette
await page.getByRole("button", { name: "Rosso", exact: true }).click();
await page.waitForTimeout(600);
const filteredCount = await page.locator("#eventi button[aria-pressed]").count();
console.log("dopo filtro palette Rosso:", filteredCount);
if (filteredCount >= thumbCount) note("filter", "il filtro palette non ha ridotto la griglia");
await page.screenshot({ path: `${OUT}\\p-03-picker-filtrato.png` });

// scegli una grafica diversa
const target = page.locator("#eventi button[aria-pressed]").nth(1);
const targetTitle = await target.getAttribute("title");
await target.click();
await page.waitForTimeout(900);

const coverAfter = await page
  .locator("#eventi img[alt^='Copertina evento']")
  .first()
  .getAttribute("src");
console.log("copertina dopo la scelta:", coverAfter, "| scelta:", targetTitle);
if (coverAfter === coverBefore) note("picker", "cliccare la miniatura non ha cambiato la copertina");
await page.screenshot({ path: `${OUT}\\p-04-copertina-cambiata.png` });

// cambia evento: la selezione deve seguire il dato, non restare incollata
await page.getByRole("button", { name: /Track Pulse Cremona/i }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}\\p-05-altro-evento.png` });

// stato premuto del cursore: le ruote devono restare visibili
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.locator("h1").first().waitFor({ state: "visible", timeout: 20000 });
await page.waitForTimeout(3500);

const link = page.locator("a").filter({ hasText: /Iscriviti|Scopri|Unisciti/i }).first();
const box = await link.boundingBox();
if (box) {
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}\\p-06-cursore-hover.png` });
  await page.mouse.down();
  await page.waitForTimeout(260);
  await page.screenshot({ path: `${OUT}\\p-07-cursore-premuto.png` });
  await page.mouse.up();
} else {
  const anyLink = page.locator("a[href^='#']").first();
  const b = await anyLink.boundingBox();
  if (b) {
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(700);
    await page.mouse.down();
    await page.waitForTimeout(260);
    await page.screenshot({ path: `${OUT}\\p-07-cursore-premuto.png` });
    await page.mouse.up();
  } else {
    note("cursor", "nessun link interattivo trovato per provare lo stato premuto");
  }
}

await browser.close();
console.log(issues.length ? "ISSUES:" : "NO ISSUES");
issues.forEach((i) => console.log("  " + i));
