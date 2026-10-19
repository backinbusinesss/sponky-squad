import { sql, json, handleCors, readJsonBody } from "./_lib/http.js";
import { hashPassword, signSession, setSessionCookies, makeMemberId } from "./_lib/auth.js";
import { validateRegistration, hasErrors } from "./_lib/validate.js";
import { checkRateLimit, recordFailedAttempt, clearAttempts } from "./_lib/rateLimit.js";

/**
 * Registrazione. Non c'e' conferma via email: l'account e' subito attivo e
 * l'utente viene autenticato immediatamente, poi il front lo rimanda su /account.
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

  const { errors, data } = validateRegistration(body);
  if (hasErrors(errors)) return json(req, res, 422, { errors });

  // Il numero tessera e' scelto dall'utente, quindi puo' collidere con quello
  // di un altro. Lo controlliamo prima di provare l'inserimento, cosi' da
  // restituire un errore leggibile invece di un 500.
  const limit = await checkRateLimit(req, "register", data.email);
  if (!limit.allowed) {
    return json(
      req,
      res,
      429,
      { error: "Troppi tentativi. Riprova fra qualche minuto." },
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  const existing = await sql()`
    select 1 from users
    where lower(email) = ${data.email}
       or card_number = ${data.card_number}
    limit 1
  `;
  if (existing.length) {
    await recordFailedAttempt(req, "register", data.email);
    return json(req, res, 409, {
      errors: {
        email: "Esiste gia' un account con questa email o con questo numero tessera.",
      },
    });
  }

  let user;
  try {
    // hashPassword e' l'unico punto in cui la password esiste in chiaro.
    const passwordHash = await hashPassword(data.password);
    const memberId = makeMemberId();

    const rows = await sql()`
      insert into users (
        first_name, last_name, email, password_hash, cap, age_range,
        card_number, group_name, riding_styles, discount_interests,
        privacy_accepted, privacy_accepted_at, newsletter, member_id, is_admin
      ) values (
        ${data.first_name}, ${data.last_name}, ${data.email}, ${passwordHash}, ${data.cap}, ${data.age_range},
        ${data.card_number}, ${data.group_name}, ${data.riding_styles}, ${data.discount_interests},
        ${data.privacy_accepted}, ${data.privacy_accepted ? new Date().toISOString() : null}, ${data.newsletter},
        ${memberId}, false
      )
      returning id, first_name, last_name, email, cap, age_range, card_number,
                group_name, riding_styles, discount_interests, newsletter,
                member_id, created_at, token_version, is_active
    `;
    user = rows[0];
  } catch (error) {
    // 23505 = unique_violation. Puo' capitare se due richieste concorrenti
    // prendono lo stesso numero tessera fra il controllo e l'inserimento.
    if (error?.code === "23505" || /unique/i.test(String(error?.message))) {
      return json(req, res, 409, {
        errors: { card_number: "Questo numero tessera e' gia' stato scelto." },
      });
    }
    console.error("register failed", error);
    return json(req, res, 500, { error: "Registrazione non riuscita. Riprova." });
  }

  await clearAttempts(req, "register", data.email);

  const token = signSession({
    sub: user.id,
    name: user.first_name,
    tv: user.token_version,
    admin: false,
  });
  const csrfToken = setSessionCookies(res, token);

  return json(req, res, 201, { ok: true, csrfToken, user: publicUser(user) });
}

/**
 * L'unico campo che non deve mai lasciare il server e' password_hash.
 * Costruisco l'oggetto pubblico esplicitamente invece di cancellare i campi:
 * cancellare e' pericoloso, perche' un campo dimenticato viene esposto.
 */
export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    cap: user.cap,
    ageRange: user.age_range,
    cardNumber: user.card_number,
    groupName: user.group_name,
    ridingStyles: user.riding_styles ?? [],
    discountInterests: user.discount_interests ?? [],
    newsletter: user.newsletter,
    memberId: user.member_id,
    isActive: user.is_active,
    isAdmin: user.is_admin ?? false,
    createdAt: user.created_at,
  };
}
