import { sql } from "./http.js";
import { fingerprint } from "./auth.js";

/**
 * Rate limiting per il brute-force.
 *
 * Non esiste una memoria condivisa fra le serverless function: ogni
 * invocazione ha la sua. Un contatore in variabile globale NON funziona,
 * perche' la prossima prova potrebbe finire su un'altra istanze e ripartire
 * da zero. Il contatore deve stare nel database, che e' l'unico posto che
 * tutte le istanze vedono.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minuti
const MAX_USER_ATTEMPTS = 5;      // login utente
const MAX_ADMIN_ATTEMPTS = 3;     // login admin: soglia piu' bassa

function bucketFor(req, scope, identifier) {
  // l'IP + l'indirizzo insieme: cosi' un attaccante non puo' bloccare
  // l'account di una vittima solo provando password a caso dal proprio IP
  return fingerprint(scope, req.headers?.["x-forwarded-for"] ?? "unknown", identifier);
}

/**
 * Ritorna { allowed, retryAfterSeconds }.
 */
export async function checkRateLimit(req, scope, identifier) {
  const bucket = bucketFor(req, scope, identifier);
  const limit = scope === "admin" ? MAX_ADMIN_ATTEMPTS : MAX_USER_ATTEMPTS;
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const rows = await sql()`
    select count(*)::int as attempts,
           extract(epoch from (min(attempted_at) + interval '15 minutes' - now()))::int as retry_after
    from login_attempts
    where bucket = ${bucket}
      and scope = ${scope}
      and attempted_at > ${since}
  `;

  const attempts = rows?.[0]?.attempts ?? 0;
  if (attempts >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(rows?.[0]?.retry_after ?? 0, 1),
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Registra un tentativo FALLITO. I tentativi riusciti vengono azzerati,
 * cosi' un utente legittimo che sbaglia una volta non resta incastrato
 * per quindici minuti.
 */
export async function recordFailedAttempt(req, scope, identifier) {
  const bucket = bucketFor(req, scope, identifier);
  await sql()`
    insert into login_attempts (bucket, scope)
    values (${bucket}, ${scope})
  `;
}

export async function clearAttempts(req, scope, identifier) {
  const bucket = bucketFor(req, scope, identifier);
  await sql()`
    delete from login_attempts
    where bucket = ${bucket}
      and scope = ${scope}
  `;
}

/**
 * Registra un evento riuscito nello stesso contatore dei fallimenti.
 * Usato dalle richieste partner: non e' un errore, ma serve a non far
 * scrivere la stessa email decine di volte.
 */
export async function recordAttempt(req, scope, identifier) {
  const bucket = bucketFor(req, scope, identifier);
  await sql()`
    insert into login_attempts (bucket, scope)
    values (${bucket}, ${scope})
  `;
}

/**
 * Pulizia periodica delle righe vecchie. Non la chiamo a ogni richiesta
 * (sarebbe un write inutile sul percorso caldo): la invoco quando il
 * contatore supera una certa soglia.
 */
export async function pruneAttempts() {
  const since = new Date(Date.now() - WINDOW_MS * 2).toISOString();
  await sql()`delete from login_attempts where attempted_at < ${since}`;
}
