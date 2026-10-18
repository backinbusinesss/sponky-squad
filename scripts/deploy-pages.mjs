/**
 * Deploy su GitHub Pages: builda con VITE_BASE=/sponky-squad/ e spinge
 * il contenuto di dist/ su un branch gh-pages orfano (senza Actions).
 *
 * Uso: npm run deploy
 */
import { execSync } from "node:child_process";
import fs from "node:fs";

const REPO = "backinbusinesss/sponky-squad";
const BASE = "/sponky-squad/";

const run = (cmd, opts = {}) =>
  execSync(cmd, { stdio: "inherit", ...opts });

console.log(`[deploy] build con base ${BASE}`);
run(`npm run build`, { env: { ...process.env, VITE_BASE: BASE } });

// pulizia: niente pagine di sviluppo online
for (const junk of ["cursor-preview.html", "graphics-preview.html"]) {
  const p = `dist/${junk}`;
  if (fs.existsSync(p)) fs.rmSync(p);
}

console.log("[deploy] preparo branch gh-pages orfano");
if (fs.existsSync(".deploy-tmp")) fs.rmSync(".deploy-tmp", { recursive: true, force: true });
fs.mkdirSync(".deploy-tmp");

run("git init -q -b gh-pages .deploy-tmp");
run("git -C .deploy-tmp config user.name backinbusinesss");
run("git -C .deploy-tmp config user.email backinbusinesss@users.noreply.github.com");

// copia dist dentro il branch temporaneo
fs.cpSync("dist", ".deploy-tmp", { recursive: true });

// .nojekyll: GitHub non deve processare gli asset
fs.writeFileSync(".deploy-tmp/.nojekyll", "");

run("git -C .deploy-tmp add -A");
run('git -C .deploy-tmp commit -q -m "deploy: aggiornamento sito"');
console.log(`[deploy] push verso https://github.com/${REPO} (branch gh-pages)`);
run(`git -C .deploy-tmp push -f https://github.com/${REPO}.git gh-pages:gh-pages`);

fs.rmSync(".deploy-tmp", { recursive: true, force: true });
console.log(
  `[deploy] fatto. Pages pubblica su https://backinbusinesss.github.io/sponky-squad/ (attivo tra ~1 min)`,
);
