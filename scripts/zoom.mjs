import { chromium } from "playwright";

/**
 * Zoom su un elemento: isola il suo riquadro (con un po' di respiro) e lo
 * cattura a DPR alto, cosi' si vedono kerning, doppioni e artefatti.
 *
 * Uso: node scripts/zoom.mjs <css-selector> [nome-file] [w] [h] [padding]
 *   Se piu' elementi matchano, si prende il primo VISIBILE.
 */
const selector = process.env.ZOOM_SEL ?? process.argv[2];
if (!selector) {
  console.error("serve un selettore CSS");
  process.exit(1);
}
const name = process.argv[3] ?? "zoom";
const width = Number(process.argv[4] ?? 390);
const height = Number(process.argv[5] ?? 844);
const pad = Number(process.argv[6] ?? 16);
const url = process.argv[7] ?? "http://localhost:4173/";

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: 3,
});
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(3200);

await page.evaluate(async () => {
  const step = window.innerHeight * 0.8;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 110));
  }
  window.scrollTo(0, 0);
});

const clip = await page.evaluate(
  ([sel, p]) => {
    const el = [...document.querySelectorAll(sel)].find((n) => {
      const r = n.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(n).display !== "none";
    });
    if (!el) return null;
    el.scrollIntoView({ block: "center", behavior: "instant" });
    return new Promise((res) =>
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        const top = Math.max(0, r.top - p);
        res({
          x: Math.max(0, r.left - p),
          y: top,
          width: Math.min(window.innerWidth, r.width + p * 2),
          height: Math.max(24, Math.min(window.innerHeight - top, r.height + p * 2)),
        });
      }, 900),
    );
  },
  [selector, pad],
);

const file = `screenshots/${name}.png`;
if (!clip) {
  // chiudere prima di uscire: altrimenti il processo resta appeso sul browser
  await browser.close();
  console.error(`nessun elemento visibile per ${selector}`);
  process.exit(1);
}

await page.waitForTimeout(600);
await page.screenshot({ path: file, clip });
console.log(`ok -> ${file}  clip=${JSON.stringify(clip)}`);
await browser.close();
