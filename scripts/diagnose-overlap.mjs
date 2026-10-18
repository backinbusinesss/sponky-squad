import { chromium } from "playwright";

/**
 * Diagnostica mirata: elenca le coppie di testi che si sovrappongono,
 * riportando testo, rettangolo, visibilita' e se l'elemento e' un menu
 * richiudibile o un elemento nascosto. Serve a separare i falsi positivi
 * dai bug veri.
 * Uso: node scripts/diagnose-overlap.mjs [url] [width] [height]
 */
const url = process.argv[2] ?? "http://localhost:4173/";
const width = Number(process.argv[3] ?? 390);
const height = Number(process.argv[4] ?? 844);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2000);
await page.evaluate(async () => {
  const step = window.innerHeight * 0.8;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 300));
});
await page.waitForTimeout(1500);

const rows = await page.evaluate(() => {
  const foglie = [...document.querySelectorAll("h1,h2,h3,h4,p,a,button,li,span,div")].filter((el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 12 || r.height < 8) return false;
    return [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
  });

  const info = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    let hidden = false;
    for (let p = el; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") hidden = true;
      if (s.transform !== "none" && p !== el) {
        // trasformato: puo' essere un menu richiuso
      }
    }
    const id = [];
    for (let p = el; p && id.length < 3; p = p.parentElement) {
      if (p.id) id.push("#" + p.id);
      const c = p.getAttribute("class");
      if (c) id.push("." + c.split(" ").filter(Boolean).slice(0, 3).join("."));
    }
    return {
      tag: el.tagName.toLowerCase(),
      cls: (el.getAttribute("class") || "").slice(0, 60),
      txt: (el.textContent || "").trim().slice(0, 46),
      rect: `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`,
      pos: cs.position,
      vis: cs.visibility,
      op: cs.opacity,
      hidden,
      chain: id.join(" > ").slice(0, 150),
    };
  };

  const out = [];
  for (let i = 0; i < foglie.length; i += 1) {
    for (let j = i + 1; j < foglie.length; j += 1) {
      const a = foglie[i];
      const b = foglie[j];
      if (a.contains(b) || b.contains(a)) continue;
      const fa = a.closest(".preserve-3d");
      if (fa && fa === b.closest(".preserve-3d")) continue;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ox > 6 && oy > 6) out.push({ a: info(a), b: info(b), ox: Math.round(ox), oy: Math.round(oy) });
    }
  }
  return out;
});

console.log(`coppie sovrapposte: ${rows.length}\n`);
for (const r of rows.slice(0, 20)) {
  console.log(`--- overlap ${r.ox}x${r.oy}px`);
  console.log(`  A: <${r.a.tag}> "${r.a.txt}" @${r.a.rect} pos=${r.a.pos} op=${r.a.op} hidden=${r.a.hidden}`);
  console.log(`     ${r.a.chain}`);
  console.log(`  B: <${r.b.tag}> "${r.b.txt}" @${r.b.rect} pos=${r.b.pos} op=${r.b.op} hidden=${r.b.hidden}`);
  console.log(`     ${r.b.chain}`);
}

await browser.close();
