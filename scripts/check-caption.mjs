import { chromium } from "playwright";

/**
 * Controlli rapidi sulle didascalie duplicate: quante istanze sono realmenti
 * visibili (display/rect), e se il testo coincide. Serve a capire se un
 * "doppio testo" e' bug di rendering oppure solo la variante responsive.
 */
const browser = await chromium.launch();
for (const [w, h, tag] of [[390, 844, "mobile"], [1440, 900, "desktop"]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto("http://localhost:4173/", { waitUntil: "load" });
  await page.waitForTimeout(2000);
  // i reveal animano con ScrollTrigger: la sezione resta a opacity:0
  // finche' non viene percorsa, quindi si scorre fino alla mappa
  await page.evaluate(() => {
    document.querySelector("#community")?.scrollIntoView({ block: "start" });
  });
  await page.waitForTimeout(1600);
  const info = await page.evaluate(() => {
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return cs.display !== "none" && cs.visibility !== "hidden" && r.width > 0 && r.height > 0;
    };
    const all = [...document.querySelectorAll("#community p")];
    return {
      pTotali: all.length,
      pVisibili: all.filter(vis).length,
      testi: all.filter(vis).map((n) => n.textContent.trim().slice(0, 46)),
    };
  });
  console.log(`[${tag}] p in #community: ${info.pTotali}, visibili: ${info.pVisibili}`);
  for (const t of info.testi) console.log(`    - "${t}"`);
  await page.close();
}
await browser.close();
