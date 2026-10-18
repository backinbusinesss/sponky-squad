import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

/**
 * Converte le texture .glb in .png e ne analizza la palette dominante,
 * cosi' si capisce quali colori (es. gli pneumatici arancioni) rimappare.
 */
const texDir = "screenshots/tex";
const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const page = await browser.newPage();

const files = fs.readdirSync(texDir).filter((n) => n.endsWith(".webp"));
const viewer = path.join(texDir, "_view.html");
fs.writeFileSync(
  viewer,
  `<!doctype html><meta charset="utf-8"><body>` +
    files.map((f, i) => `<img id="t${i}" src="${f}">`).join("") +
    `</body>`,
);
await page.goto("file:///" + viewer.replace(/\\/g, "/"));

for (const [i, f] of files.entries()) {
  const res = await page.evaluate(async (id) => {
    const img = document.getElementById(id);
    try {
      await img.decode();
    } catch {
      return { errore: "decode fallita", src: img.src };
    }
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;

    // istogramma quantizzato a 32 livelli per canale
    const hist = new Map();
    let orange = 0;
    let total = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      total += 1;
      // arancione: rosso dominante, verde medio, blu basso
      if (r > 150 && r > b + 70 && g > b && g < r - 25 && g > 60) orange += 1;
      const key = `${r >> 5},${g >> 5},${b >> 5}`;
      hist.set(key, (hist.get(key) || 0) + 1);
    }
    const top = [...hist.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([k, n]) => {
        const [r, g, b] = k.split(",").map((v) => Number(v) * 32 + 16);
        return { rgb: `rgb(${r},${g},${b})`, pct: +((n / total) * 100).toFixed(1) };
      });

    return {
      w: c.width,
      h: c.height,
      orangePct: +((orange / total) * 100).toFixed(1),
      top,
      png: c.toDataURL("image/png"),
    };
  }, `t${i}`);

  if (res.errore) {
    console.log(`\n${f} -> ERRORE: ${res.errore}`);
    continue;
  }
  const base = f.replace(".webp", "");
  fs.writeFileSync(
    path.join(texDir, `${base}.png`),
    Buffer.from(res.png.split(",")[1], "base64"),
  );
  console.log(`\n${f} -> ${res.w}x${res.h}`);
  console.log(`  arancione (pneumatici?): ${res.orangePct}% dei pixel`);
  console.log("  colori dominanti:", res.top.map((t) => `${t.rgb} ${t.pct}%`).join(" | "));
}

await browser.close();
console.log("\ndone");
