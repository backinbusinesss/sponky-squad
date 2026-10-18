import { chromium } from "playwright";

const url = "https://backinbusinesss.github.io/sponky-squad/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(3000);

const info = await page.evaluate(() => ({
  h1: document.querySelector("h1")?.textContent?.trim() ?? null,
  canvas: document.querySelectorAll("canvas").length,
  sezioni: document.querySelectorAll("section").length,
  motoCursore: !!document.querySelector(".cursor, [data-cursor]"),
  css: [...document.styleSheets].map((s) => (s.href || "").split("/").pop()).filter(Boolean),
}));

console.log("h1      :", info.h1);
console.log("canvas  :", info.canvas, "| sezioni:", info.sezioni);
console.log("css     :", info.css.join(", ") || "nessuna");
console.log("errori  :", errors.length ? errors : "NESSUNO");

await page.screenshot({ path: "screenshots/live-1440.png" });
await browser.close();
