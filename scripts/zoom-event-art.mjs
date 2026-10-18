/** Ingrandisce due copertine per il controllo ravvicinato. */
import fs from "node:fs";
import { chromium } from "playwright";

const dir = "public/assets/event-art";
const out = "review";
const picks = ["art-01.svg", "art-07.svg", "art-16.svg"];

const html = `<!doctype html><html><body style="margin:0;background:#05060A;display:flex;gap:12px;padding:12px">
${picks.map((f) => `<img src="../${dir}/${f}" style="width:600px;display:block">`).join("")}
</body></html>`;
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(`${out}/event-art-zoom.html`, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1900, height: 800 }, deviceScaleFactor: 1 });
await page.goto(`file:///${process.cwd().replace(/\\/g, "/")}/${out}/event-art-zoom.html`);
await page.waitForTimeout(900);
await page.screenshot({ path: "screenshots/event-art-zoom.png", fullPage: true });
await browser.close();
console.log("ok");
