/**
 * Screenshot delle pagine di autenticazione dal build di preview locale.
 * Usage: node scripts/shot-auth.mjs <outname> <hash> [action]
 *   outname: screenshots/<outname>.png
 *   hash: "#/account", "#/admin", "#/" ...
 *   action: "login" apre la modale di accesso, "register" apre quella di
 *           iscrizione, "partner" apre la modale partnership
 *
 * Non serve un backend: /api/me non risponde e l'app mostra lo stato
 * "anonymous", che e' esattamente cio' che un visitatore vede da fuori.
 */
import { chromium } from "playwright";

const name = process.argv[2] ?? "auth";
const hash = process.argv[3] ?? "#/";
const action = process.argv[4];

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 2,
});

// evita che la richiesta /api/me indugi sul timeout di rete
await page.route("**/api/**", (route) =>
  route.fulfill({
    status: 401,
    contentType: "application/json",
    body: JSON.stringify({ error: "Sessione non valida." }),
  }),
);

const port = process.env.PORT ?? "4173";
await page.goto(`http://localhost:${port}/${hash}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1800);

if (action === "login") {
  // "Accedi" è un <a> (Button asChild), non un <button>: cerco per testo
  await page.getByText("Accedi", { exact: true }).first().click();
  await page.waitForTimeout(500);
} else if (action === "register") {
  await page.getByText("Accedi", { exact: true }).first().click();
  await page.waitForTimeout(400);
  const switcher = page.getByText("Iscriviti gratis", { exact: true });
  if (await switcher.count()) {
    await switcher.first().click();
    await page.waitForTimeout(500);
  }
} else if (action === "partner") {
  await page.getByText("Partner", { exact: true }).first().click();
  await page.waitForTimeout(500);
}

await page.screenshot({ path: `screenshots/${name}.png`, fullPage: false });
await browser.close();
console.log(`ok -> screenshots/${name}.png  (${hash}${action ? " / " + action : ""})`);
