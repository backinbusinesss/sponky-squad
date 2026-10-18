import { chromium } from "playwright";

/**
 * Cattura una o piu' sezioni reali, su piu' viewport, dopo aver attraversato
 * tutta la pagina (cosi' le animazioni on-scroll sono a regime).
 *
 * Uso: node scripts/shot-sections.mjs [url]
 *   ogni voce di TARGETS: selettore CSS -> nome file
 */
const url = process.argv[2] ?? "http://localhost:4173/";

const TARGETS = [
  ["#community", "map"],
  ["#tessera", "card"],
  ['button[aria-label^="Mostra testimonianza"]', "testi"],
];

const VIEWPORTS = [
  [390, 844, "mobile"],
  [1440, 900, "desktop"],
];

const browser = await chromium.launch();

for (const [width, height, tag] of VIEWPORTS) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 2,
  });
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2200);

  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 110));
    }
  });
  await page.waitForTimeout(1000);

  for (const [selector, name] of TARGETS) {
    try {
      // "nearest" si ferma appena la sezione sfiora il viewport, e cattura
      // la sezione sbagliata: si allinea il top della sezione alla finestra
      await page.evaluate((sel) => {
        document.querySelector(sel)?.scrollIntoView({ block: "start", behavior: "instant" });
        window.scrollBy(0, -70);
      }, selector);
      await page.waitForTimeout(1100);
      const file = `screenshots/${name}-${tag}.png`;
      await page.screenshot({ path: file });
      console.log(`[${tag}] ${selector} -> ${file}`);
    } catch (err) {
      console.log(`[${tag}] ${selector} -> SKIPPED (${err.message.slice(0, 60)})`);
    }
  }

  await page.close();
}

await browser.close();
