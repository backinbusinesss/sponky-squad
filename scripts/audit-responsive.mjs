import { chromium } from "playwright";

/**
 * Audit responsive: per ogni viewport scatta la hero, rileva overflow
 * orizzontale, elementi che sforano il viewport, testo tagliato, 404 e
 * errori JS. Uso: node scripts/audit-responsive.mjs [url]
 */
const url = process.argv[2] ?? "http://localhost:4173/";
const browser = await chromium.launch();

const VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "laptop-1024", width: 1024, height: 768 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "iphone-390", width: 390, height: 844 },
  { name: "android-360", width: 360, height: 740 },
];

let problems = 0;

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: vp.width < 810,
    hasTouch: vp.width < 810,
  });
  const page = await context.newPage();
  const errors = [];
  const bad = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`);
  });

  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  // scorre tutta la pagina: attiva le lazy-load e le animazioni on-scroll,
  // cosi' i controlli valutano la pagina a regime e non a vuoto
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 130));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 400));
  });
  await page.waitForTimeout(1800);

  const report = await page.evaluate(() => {
    const vw = window.innerWidth;
    const out = { overflowX: 0, sforano: [], tagliati: [], canvas: 0, decori: 0 };

    out.overflowX = document.documentElement.scrollWidth - vw;

    // elementi che escono dal viewport in orizzontale.
    // Un decoro tagliato per design non e' un bug: sia che sfiori la soglia,
    // sia che sia nascosto da un antenato con overflow hidden/clip.
    const clipAncestor = (el) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const o = getComputedStyle(p);
        if (o.overflowX === "hidden" || o.overflowX === "clip") return true;
      }
      return false;
    };
    // un decoro (nessun testo dentro) tagliato da un antenato hidden/clip
    // e' tale per design, non e' un bug
    const decoroTagliato = (el) => !el.textContent.trim() && clipAncestor(el);
    for (const el of document.querySelectorAll("section *")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right <= vw + 2 && r.left >= -2) continue;
      if (decoroTagliato(el)) {
        out.decori += 1;
        continue;
      }
      const cls = (el.getAttribute("class") || "").slice(0, 70);
      out.sforano.push(`${el.tagName.toLowerCase()}.${cls} [${Math.round(r.left)}..${Math.round(r.right)}]`);
    }

    // testo con contenuto tagliato (scrollHeight > clientHeight in modo netto)
    for (const el of document.querySelectorAll("h1,h2,h3,p,a,button")) {
      const cs = getComputedStyle(el);
      if (cs.overflow === "hidden" && el.scrollHeight > el.clientHeight + 4) {
        out.tagliati.push((el.textContent || "").trim().slice(0, 44));
      }
    }

    out.canvas = document.querySelectorAll("canvas").length;
    out.sezioni = document.querySelectorAll("section").length;
    out.h1 = (document.querySelector("h1")?.textContent || "").trim().slice(0, 40);

    // --- testi che finiscono uno dentro l'altro (sovrapposizione reale) ---
    const foglie = [...document.querySelectorAll("h1,h2,h3,h4,p,a,button,li,span,div")].filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 12 || r.height < 8) return false;
      return [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    });
    out.sovrapposti = [];
    for (let i = 0; i < foglie.length; i += 1) {
      for (let j = i + 1; j < foglie.length; j += 1) {
        const a = foglie[i];
        const b = foglie[j];
        if (a.contains(b) || b.contains(a)) continue;
        // le due facce della card 3D stanno nello stesso riquadro per design
        const fa = a.closest(".preserve-3d");
        if (fa && fa === b.closest(".preserve-3d")) continue;
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (ox > 6 && oy > 6) {
          const tag = (el) => `${el.tagName.toLowerCase()}.${(el.getAttribute("class") || "").slice(0, 26)}`;
          out.sovrapposti.push(`${tag(a)} <> ${tag(b)}`);
        }
      }
    }

    // --- pulsanti/link troppo piccoli per il tocco ---
    out.piccoli = [];
    for (const el of document.querySelectorAll("a,button,[role='button']")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.height < 36 || r.width < 36) {
        out.piccoli.push(`${(el.textContent || el.getAttribute("aria-label") || "?").trim().slice(0, 22)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    }

    // --- immagini definite ma non decodificate (le lazy non ancora attivate restano fuori) ---
    out.imgRotte = [...document.images]
      .filter((i) => i.complete && i.naturalWidth === 0)
      .map((i) => (i.currentSrc || i.src).slice(-60));

    return out;
  });

  await page.screenshot({ path: `screenshots/audit-${vp.name}-hero.png`, fullPage: false });
  await page.screenshot({ path: `screenshots/audit-${vp.name}-full.png`, fullPage: true });

  const flags = [];
  if (report.overflowX > 1) flags.push(`OVERFLOW-X +${report.overflowX}px`);
  if (report.sforano.length) flags.push(`${report.sforano.length} fuori viewport`);
  if (report.tagliati.length) flags.push(`${report.tagliati.length} testi tagliati`);
  if (report.sovrapposti.length) flags.push(`${report.sovrapposti.length} testi sovrapposti`);
  if (report.piccoli.length) flags.push(`${report.piccoli.length} target < 36px`);
  if (report.imgRotte.length) flags.push(`${report.imgRotte.length} immagini rotte`);
  if (errors.length) flags.push(`${errors.length} errori JS`);
  if (bad.length) flags.push(`${bad.length} risposte >=400`);
  if (report.canvas === 0) flags.push("NIENTE canvas 3D");

  if (flags.length) problems += 1;
  console.log(
    `\n[${vp.name} ${vp.width}x${vp.height}] ${flags.length ? "⚠ " + flags.join(" | ") : "✓ ok"}`,
  );
  if (report.sforano.length) console.log("   fuori viewport:", report.sforano.slice(0, 6));
  if (report.tagliati.length) console.log("   testi tagliati:", report.tagliati.slice(0, 6));
  if (report.sovrapposti.length) console.log("   sovrapposti:", report.sovrapposti.slice(0, 8));
  if (report.piccoli.length) console.log("   target piccoli:", report.piccoli.slice(0, 8));
  if (report.imgRotte.length) console.log("   immagini rotte:", report.imgRotte.slice(0, 6));
  if (errors.length) console.log("   errori:", errors.slice(0, 4));
  if (bad.length) console.log("   risposte:", bad.slice(0, 6));
  if (report.decori) console.log(`   (${report.decori} decori tagliati per design, ok)`);
  console.log("   canvas:", report.canvas, "| sezioni:", report.sezioni, "| h1:", report.h1);

  await context.close();
}

console.log(`\n=== ${problems === 0 ? "NESSUN PROBLEMA" : problems + " viewport con problemi"} ===`);
await browser.close();
