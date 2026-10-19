import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { sql as getSql } from "./http.js";

export const SESSION_COOKIE = "sponky_session";
export const CSRF_COOKIE = "sponky_csrf";
export const CSRF_HEADER = "x-csrf-token";

const COOKIE_BASE = {
  httpOnly: true,   // non leggibile da JavaScript: un XSS non ruba il token
  secure: true,     // solo HTTPS
  sameSite: "None", // il sito e' su github.io e l'API su vercel.app: origine diversa
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

// bcrypt con cost 12: abbastanza lento da rendere il brute-force costoso,
// abbastanza veloso da non far andare la function in timeout.
const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain) {
  return bcrypt.hash(String(plain), BCRYPT_ROUNDS);
}

/**
 * Confronto a tempo costante. Il confronto diretto `hash === input` lascia
 * trasparire quanto e' corretto il prefisso, misurando il tempo di risposta.
 */
export async function verifyPassword(plain, hash) {
  if (typeof hash !== "string" || !hash) return false;
  try {
    return await bcrypt.compare(String(plain), hash);
  } catch {
    return false;
  }
}

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "JWT_SECRET mancante o troppo corta. Generarne una di almeno 32 caratteri.",
    );
  }
  return value;
}

export function signSession(payload) {
  return jwt.sign(payload, secret(), {
    algorithm: "HS256",
    expiresIn: "30d",
    issuer: "sponky-squad",
  });
}

/**
 * Verifica firma E scadenza. Ritorna null invece di lanciare: un token
 * scaduto o manomesso non e' un errore dell'applicazione, e' un utente
 * semplicemente non autenticato.
 */
export function verifySession(token) {
  if (typeof token !== "string" || !token) return null;
  try {
    return jwt.verify(token, secret(), { algorithms: ["HS256"], issuer: "sponky-squad" });
  } catch {
    return null;
  }
}

/**
 * Apre la sessione: cookie HttpOnly con il token, piu' il cookie CSRF.
 *
 * Ritorna il valore CSRF perche' il chiamante lo metta anche nel corpo della
 * risposta. Serve: il sito sta su github.io e l'API su vercel.app, quindi
 * `document.cookie` sul sito NON vede i cookie dell'API (appartengono a
 * un'altra origine). Il front tiene il token in memoria e lo rimanda
 * nell'header; il cookie resta la prova che il browser lo possiede davvero.
 */
export function setSessionCookies(res, token) {
  const csrf = makeCsrfToken();
  res.setHeader("Set-Cookie", [
    serializeCookie(SESSION_COOKIE, token, COOKIE_BASE),
    // unico cookie NON httpOnly: non e' un segreto da solo, serve a provare
    // che chi invia la richiesta puo' anche leggere il cookie.
    serializeCookie(CSRF_COOKIE, csrf, { ...COOKIE_BASE, httpOnly: false }),
  ]);
  return csrf;
}

/**
 * Token CSRF della sessione in corso, da rimandare al front che lo chiede
 * (per esempio dopo un ricaricamento di pagina, quando la memoria del
 * browser e' vuota ma i cookie ci sono ancora).
 */
export function currentCsrf(req) {
  return readCookie(req, CSRF_COOKIE) ?? "";
}

export function clearSessionCookies(res) {
  res.setHeader("Set-Cookie", [
    serializeCookie(SESSION_COOKIE, "", { ...COOKIE_BASE, maxAge: 0 }),
    serializeCookie(CSRF_COOKIE, "", { ...COOKIE_BASE, maxAge: 0 }),
  ]);
}

export function serializeCookie(name, value, options) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path ?? "/"}`);
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  parts.push(`SameSite=${options.sameSite ?? "Lax"}`);
  return parts.join("; ");
}

/**
 * Legge un cookie specifico dall'header Cookie della richiesta.
 * Parsing fatto a mano: non serve una dipendenza per due righe, e ogni
 * dipendenza in meno e' una superficie di attacco in meno.
 */
export function readCookie(req, name) {
  const header = req.headers?.cookie;
  if (typeof header !== "string") return null;
  for (const pair of header.split(";")) {
    const index = pair.indexOf("=");
    if (index === -1) continue;
    if (pair.slice(0, index).trim() !== name) continue;
    return decodeURIComponent(pair.slice(index + 1).trim());
  }
  return null;
}

export function getSession(req) {
  const payload = verifySession(readCookie(req, SESSION_COOKIE));
  if (!payload) return null;
  // Un token puo' essere firma-valido e comunque scaduto da un punto di
  // vista logico: se l'utente ha cambiato password o l'admin ha azzerato le
  // sessioni, token_version e' aumentata e questo token e' vecchio.
  if (typeof payload.tv !== "number") return null;
  return payload;
}

/** Legge la sessione e la confronta con il valore corrente sul database. */
export async function getSessionFresh(req) {
  const payload = getSession(req);
  if (!payload) return null;
  const db = getSql();
  const rows = await db`select token_version from users where id = ${payload.sub} limit 1`;
  const current = rows?.[0]?.token_version;
  if (typeof current !== "number" || current !== payload.tv) return null;
  return payload;
}

export function makeCsrfToken() {
  return randomBytes(24).toString("hex");
}

/**
 * Doppio controllo per le richieste che mutano stato:
 *  1. l'header X-CSRF-Token deve esistere e corrispondere al cookie
 *  2. l'header Origin deve appartenere a un dominio consentito
 *
 * Il secondo controllo copre il caso in cui un attaccante riesca a far
 * inviare la richiesta ma non a leggere il cookie (non servirebbe a nulla).
 */
export function csrfOk(req) {
  const origin = req.headers?.origin;
  if (origin) {
    const allowed = (process.env.ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .concat([
        "https://backinbusinesss.github.io",
        "https://sponkysquad.vercel.app",
        "http://localhost:5173",
        "http://localhost:4173",
      ]);
    if (!allowed.includes(origin)) return false;
  }

  const cookie = readCookie(req, CSRF_COOKIE);
  const header = req.headers?.[CSRF_HEADER];
  if (!cookie || !header || typeof header !== "string") return false;
  return safeEqual(cookie, header);
}

/** Confronto a tempo costante fra due stringhe. */
export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Codice membro univoco mostrato sulla tessera, del tipo SS-4F2K-9XQ1.
 * randomBytes e' un CSPRNG: non c'e' modo di prevedere il codice di un
 * altro utente leggendo il proprio.
 */
export function makeMemberId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // niente 0/O e 1/I
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
    if (i === 3) out += "-";
  }
  return `SS-${out}`;
}

/** Hash non cripttico, per indicizzare i tentativi di login senza conservare gli indirizzi. */
export function fingerprint(...parts) {
  return createHmac("sha256", secret())
    .update(parts.map((p) => String(p ?? "")).join("|"))
    .digest("hex");
}
