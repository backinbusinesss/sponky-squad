import { sql, json, handleCors, readJsonBody } from "../_lib/http.js";
import { verifyPassword, signSession, setSessionCookies } from "../_lib/auth.js";
import { checkRateLimit, recordFailedAttempt, clearAttempts, pruneAttempts } from "../_lib/rateLimit.js";

/**
 * Login dell'amministratore.
 *
 * Non usa la stessa tabella degli endpoint di login normali: ha una soglia
 * di rate limiting piu' bassa e un percorso di verifica separato, perche'
 * non deve esistere un modo di raggiungere /admin passando per il form
 * pubblico.
 */
export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "POST") return json(req, res, 405, { error: "Metodo non consentito." });

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return json(req, res, 400, { error: "Corpo della richiesta non valido." });
  }

  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!username || !password) {
    return json(req, res, 422, { errors: { password: "Inserisci credenziali." } });
  }

  const limit = await checkRateLimit(req, "admin", username);
  if (!limit.allowed) {
    return json(
      req,
      res,
      429,
      { error: "Troppi tentativi. Riprova piu' tardi." },
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  let rows = [];
  try {
    rows = await sql()`
      select id, first_name, last_name, password_hash, is_active, is_admin, token_version
      from users
      where lower(email) = ${username} or lower(member_id) = ${username}
      limit 1
    `;
  } catch (error) {
    console.error("admin login query failed", error);
    return json(req, res, 500, { error: "Accesso non riuscito." });
  }

  const user = rows[0];
  const ok = user ? await verifyPassword(password, user.password_hash) : false;

  // Un utente normale che prova /admin fallisce identicamente a uno sbagliato:
  // non si scopre quali account hanno il flag amministratore.
  if (!user || !ok || !user.is_admin || !user.is_active) {
    await recordFailedAttempt(req, "admin", username);
    return json(req, res, 401, { error: "Credenziali non valide." });
  }

  await clearAttempts(req, "admin", username);
  await pruneAttempts().catch(() => {});

  const token = signSession({
    sub: user.id,
    name: user.first_name,
    tv: user.token_version,
    admin: true,
  });
  setSessionCookies(res, token);

  return json(req, res, 200, {
    ok: true,
    user: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      isAdmin: true,
    },
  });
}
