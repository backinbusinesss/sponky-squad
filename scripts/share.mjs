/**
 * Avvia il sito in preview e lo espone su un link pubblico condivisibile
 * usando un Cloudflare Quick Tunnel (nessun account, nessuna password).
 *
 * Uso:
 *   npm run share            -> preview build + tunnel
 *   npm run share -- --dev   -> dev server + tunnel (hot reload)
 *
 * La prima esecuzione scarica il binario cloudflared in .bin/ (solo Windows x64
 * e macOS/Linux x64 gestiti automaticamente).
 */
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const binDir = path.join(root, ".bin");
const useDev = process.argv.includes("--dev");
const PORT = useDev ? 5173 : 4173;

function binaryName() {
  if (process.platform === "win32") return "cloudflared.exe";
  return "cloudflared";
}

function resolveBinary() {
  const local = path.join(binDir, binaryName());
  if (fs.existsSync(local)) return local;

  const fromPath = findOnPath(binaryName());
  if (fromPath) return fromPath;

  return downloadCloudflared(local);
}

function findOnPath(name) {
  const dirs = (process.env.PATH ?? "").split(path.delimiter);
  for (const dir of dirs) {
    const candidate = path.join(dir, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function downloadCloudflared(target) {
  fs.mkdirSync(binDir, { recursive: true });

  let asset;
  if (process.platform === "win32") {
    asset = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe";
  } else if (process.platform === "darwin") {
    asset = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz";
  } else {
    asset = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64";
  }

  console.log(`[share] Scarico cloudflared (${asset})...`);

  if (asset.endsWith(".tgz")) {
    const tarball = path.join(binDir, "cloudflared.tgz");
    execFileSync("curl", ["-L", "-o", tarball, asset], { stdio: "inherit" });
    execFileSync("tar", ["-xzf", tarball, "-C", binDir], { stdio: "inherit" });
    fs.rmSync(tarball, { force: true });
    fs.chmodSync(target, 0o755);
  } else {
    execFileSync("curl", ["-L", "-o", target, asset], { stdio: "inherit" });
    if (process.platform !== "win32") fs.chmodSync(target, 0o755);
  }

  return target;
}

const cloudflared = resolveBinary();
console.log(`[share] Avvio ${useDev ? "dev server" : "preview"} sulla porta ${PORT}...`);

const app = spawn("npm", ["run", useDev ? "dev" : "preview", "--", "--port", String(PORT)], {
  cwd: root,
  shell: process.platform === "win32",
  stdio: "inherit",
});

const tunnel = spawn(
  cloudflared,
  ["tunnel", "--url", `http://localhost:${PORT}`, "--no-autoupdate"],
  { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
);

let printedUrl = false;

function scan(chunk) {
  const text = String(chunk);
  const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (match && !printedUrl) {
    printedUrl = true;
    console.log("\n==============================================");
    console.log("  LINK CONDIVISIBILE (attivo finche resta aperto):");
    console.log(`  ${match[0]}`);
    console.log("==============================================\n");
  }
  process.stdout.write(text);
}

tunnel.stdout.on("data", scan);
tunnel.stderr.on("data", scan);

function shutdown() {
  tunnel.kill();
  app.kill();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
