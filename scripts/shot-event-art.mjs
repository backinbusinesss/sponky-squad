/** Foglio di contatto delle copertine evento + screenshot. */
import fs from "node:fs";
import { chromium } from "playwright";

const dir = "public/assets/event-art";
// Il foglio di contatto vive in review/: scriverlo in public/ lo finirebbe nel
// bundle di produzione.
const out = "review";
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".svg")).sort();

const html = `<!doctype html><html><body style="margin:0;background:#05060A;display:grid;grid-template-columns:repeat(13,1fr);gap:6px;padding:10px">
${files.map((f) => `<img src="../${dir}/${f}" style="width:100%;display:block;border-radius:4px">`).join("")}
</body></html>`;
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(`${out}/event-art-sheet.html`, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1 });
await page.goto(`file:///${process.cwd().replace(/\\/g, "/")}/${out}/event-art-sheet.html`);
await page.waitForTimeout(1200);
await page.screenshot({ path: "screenshots/event-art-sheet.png", fullPage: true });
await browser.close();
console.log("ok");
