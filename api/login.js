import { sql, json, handleCors, readJsonBody } from "./_lib/http.js";
import { verifyPassword, signSession, setSessionCookies } from "./_lib/auth.js";
import { validateLogin, hasErrors } from "./_lib/validate.js";
import { checkRateLimit, recordFailedAttempt, clearAttempts, pruneAttempts } from "./_lib/rateLimit.js";

/**
 * Login utente.
 *
 * Due scelte deliberate qui dentro:
 *
 * 1. La risposta di "email non trovata" e' identica a quella di "password
 *    sbagliata". Un attacker non puo' quindi scoprire quali indirizzi
 *    hanno un account semplicemente provandoli.
 *
 * 2. Se l'account e' disattivato, il login fallisce lo stesso. Non si dice
 *    "il tuo account e' disattivato", perche' sarebbe un feedback utilissimo
 *    per chi sta provando a indovinare.
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

  const { errors, data } = validateLogin(body);
  if (hasErrors(errors)) return json(req, res, 422, { errors });

  const limit = await checkRateLimit(req, "user", data.email);
  if (!limit.allowed) {
    return json(
      req,
      res,
      429,
      { error: "Troppi tentativi. Aspetta un attimo prima di riprovare." },
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  const rows = await sql()`
    select id, first_name, last_name, email, cap, age_range, card_number,
           group_name, riding_styles, discount_interests, newsletter,
           member_id, password_hash, is_active, is_admin, token_version
    from users
    where lower(email) = ${data.email}
    limit 1
  `;

  const user = rows[0];
  const ok = user ? await verifyPassword(data.password, user.password_hash) : false;

  // Un account disattivato non puo' entrare, ma non deve nemmeno poter
  // cambiare password o registrarsi di nuovo: lo trattiamo come un fallimento.
  if (!user || !ok || !user.is_active) {
    await recordFailedAttempt(req, "user", data.email);
    return json(req, res, 401, {
      error: "Credenziali errate. Controlla email e password.",
    });
  }

  await clearAttempts(req, "user", data.email);
  // pulizia opportunistica, non sul percorso caldo
  await pruneAttempts().catch(() => {});

  const token = signSession({
    sub: user.id,
    name: user.first_name,
    tv: user.token_version,
    admin: Boolean(user.is_admin),
  });
  const csrfToken = setSessionCookies(res, token);

  return json(req, res, 200, {
    ok: true,
    csrfToken,
    user: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      memberId: user.member_id,
      cardNumber: user.card_number,
      isAdmin: Boolean(user.is_admin),
    },
  });
}
