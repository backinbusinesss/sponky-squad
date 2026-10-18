/** Anteprima ravvicinata delle quattro copertine gallery (senza scritte). */
import fs from "node:fs";
import { chromium } from "playwright";

const dir = "public/assets/community-art";
const out = "review";
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".svg")).sort();

const html = `<!doctype html><html><body style="margin:0;background:#05060A;display:flex;gap:10px;padding:10px">
${files.map((f) => `<img src="../${dir}/${f}" style="width:440px;display:block">`).join("")}
</body></html>`;
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(`${out}/community-art-zoom.html`, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1840, height: 600 }, deviceScaleFactor: 1 });
await page.goto(`file:///${process.cwd().replace(/\\/g, "/")}/${out}/community-art-zoom.html`);
await page.waitForTimeout(900);
await page.screenshot({ path: "screenshots/community-art.png", fullPage: true });
await browser.close();
console.log("ok");
