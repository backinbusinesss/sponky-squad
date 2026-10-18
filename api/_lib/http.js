import { neon } from "@neondatabase/serverless";

/**
 * Connessione a Neon tramite il driver HTTP.
 *
 * Scelto invece di `pg` per un motivo pratico: le serverless function sono
 * senza stato, ogni invocazione puo' finire su un'istanza diversa. Un pool di
 * connessioni TCP si ricrea ogni volta e su Neon finisce rapidamente in
 * "too many connections". Il driver HTTP non tiene connessioni aperte.
 *
 * Le query sono parametrizzate per costruzione: sql()`...${x}` passa x come
 * parametro vero, non come stringa. Non c'e' modo di scrivere SQL injection
 * anche per distrazione.
 */
export function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL non impostata. Configurarla negli ambientali di Vercel.",
    );
  }
  return neon(url);
}

/**
 * Converto i valori che il driver HTTP restituisce come stringhe.
 * text[] arriva come stringa "{a,b}": qui diventa un array vero.
 */
export function parseTextArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || value === "") return [];
  const inner = value.startsWith("{") ? value.slice(1, -1) : value;
  if (!inner) return [];
  return inner
    .split(",")
    .map((piece) => piece.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

/**
 * Il pubblico del sito e' su GitHub Pages, l'API su Vercel: e' una chiamata
 * cross-origin, quindi le richieste arrivano senza cookie di default.
 */
const ALLOWED_ORIGINS = new Set(
  [
    "https://backinbusinesss.github.io",
    "https://sponkysquad.vercel.app",
    "http://localhost:5173",
    "http://localhost:4173",
  ]
    .concat((process.env.ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()))
    .filter(Boolean),
);

export function corsHeaders(req) {
  const origin = req.headers?.origin ?? "";
  return {
    // l'header si mette solo per origini note: mai un echo cieco dell'origin,
    // perche' un echo cieco + credenziali = qualsiasi sito puo' leggere la risposta
    ...(ALLOWED_ORIGINS.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-CSRF-Token",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function handleCors(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).setHeader("Access-Control-Max-Age", "86400").end();
    return true;
  }
  return false;
}

/**
 * Risposta JSON con gli header CORS sempre applicati.
 */
export function json(req, res, status, body, extraHeaders = {}) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  for (const [key, value] of Object.entries(corsHeaders(req))) {
    res.setHeader(key, value);
  }
  for (const [key, value] of Object.entries(extraHeaders)) {
    res.setHeader(key, value);
  }
  res.end(JSON.stringify(body));
}

/**
 * Legge il corpo JSON con un limite: senza un tetto, una richiesta enorme
 * puo' finire in memoria e bloccare l'istanza.
 */
export function readJsonBody(req, maxBytes = 32 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("invalid json"));
      }
    });
    req.on("error", reject);
  });
}

/**
 * L'indirizzo IP dell'utente. Dietro Vercel c'e' sempre un proxy: leggere
 * req.connection.remoteaddress darebbe l'IP del proxy e tutto il rate
 * limiting finirebbe per condividere un solo contatore.
 */
export function clientIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers?.["x-real-ip"] ?? "unknown";
}

/** Normalizza un indirizzo email: minuscolo e senza spazi. */
export function normaliseEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}
