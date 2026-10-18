/* Controllo finale dei due siti pubblicati su GitHub Pages.
   Aspetta finche' Pages non pubblica, poi verifica contenuti e assenza di errori. */
import { chromium } from "playwright";

const SITES = [
  {
    name: "nicoz",
    url: "https://backinbusinesss.github.io/nicoz/",
    shot: "screenshots/live-nicoz.png",
  },
  {
    name: "sponky-squad",
    url: "https://backinbusinesss.github.io/sponky-squad/",
    shot: "screenshots/live-sponky.png",
  },
];

const browser = await chromium.launch();
const issues = [];

for (const site of SITES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => m.type() === "error" && errs.push(`console: ${m.text().slice(0, 150)}`));
  page.on("pageerror", (e) => errs.push(`pageerror: ${String(e.message).slice(0, 150)}`));
  page.on("response", (r) => r.status() >= 400 && errs.push(`http ${r.status()}: ${r.url()}`));

  // Pages puo' impiegare ~1 minuto: riprova finche' non arriva la versione nuova
  let ready = false;
  for (let attempt = 0; attempt < 12 && !ready; attempt++) {
    await page.goto(site.url, { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForTimeout(4000);
    ready = await page
      .evaluate(() => {
        if (location.pathname.includes("nicoz")) {
          return !!document.querySelector("#nav-panel") && document.body.innerText.includes("P.IVA");
        }
        return document.body.innerText.includes("Scegli grafica") || !!document.querySelector("#eventi");
      })
      .catch(() => false);
    if (!ready) await page.waitForTimeout(10000);
  }

  if (!ready) issues.push(`[${site.name}] il contenuto nuovo non e' ancora online`);

  await page.waitForTimeout(2500);
  await page.screenshot({ path: site.shot, fullPage: false });

  if (site.name === "nicoz") {
    const text = await page.evaluate(() => document.body.innerText);
    const checks = [
      ["Termini e Condizioni", text.includes("Termini e Condizioni")],
      ["P.IVA", text.includes("P.IVA")],
      ["Cookie Policy", text.includes("Cookie Policy")],
      ["Preferenze di Privacy", text.includes("Preferenze di Privacy")],
      ["Telegram @creditate", text.includes("creditate")],
      ["GitHub backinbusinesss", text.includes("backinbusinesss")],
      ["Discord", text.includes("Discord")],
      ["WhatsApp", /whatsapp/i.test(text)],
      ["autopsy.lol presente", text.includes("autopsy.lol")],
      ["mc.kidnap.lol presente", text.includes("mc.kidnap.lol")],
      ["kidnap.lol rimosso (solo mc.)", !/(?<!mc\.)kidnap\.lol/.test(text.replace("mc.kidnap.lol", ""))],
    ];
    for (const [label, ok] of checks) if (!ok) issues.push(`[nicoz] manca: ${label}`);

    // pagine legali raggiungibili e cliccabili
    const href = await page.evaluate(() => {
      const a = [...document.querySelectorAll("#footer a")].find((x) =>
        /Termini|Termini e Condizioni/i.test(x.textContent),
      );
      return a ? a.getAttribute("href") : null;
    });
    if (!href) issues.push("[nicoz] link Termini e Condizioni non trovato nel footer");
    else {
      const res = await page.evaluate(async (u) => {
        const r = await fetch(u);
        return { status: r.status, url: u };
      }, href).catch(() => null);
      if (!res || res.status >= 400) issues.push(`[nicoz] Termini non raggiungibile (${href})`);
    }
  }

  if (site.name === "sponky-squad") {
    await page.locator("#eventi").scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(2500);
    await page.screenshot({ path: "screenshots/live-sponky-eventi.png" });
    const thumbs = await page.locator("#eventi button[aria-pressed]").count().catch(() => 0);
    if (thumbs < 50) issues.push(`[sponky-squad] griglia copertine: attese 52, trovate ${thumbs}`);
    else console.log(`[sponky-squad] griglia copertine online: ${thumbs}`);
  }

  if (errs.length) errs.slice(0, 8).forEach((e) => issues.push(`[${site.name}] ${e}`));
  console.log(`[${site.name}] controlli completati`);
  await ctx.close();
}

await browser.close();
console.log(issues.length ? "ISSUES:" : "NO ISSUES");
issues.forEach((i) => console.log("  " + i));
