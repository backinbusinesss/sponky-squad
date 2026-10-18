import { sql, json, handleCors, readJsonBody } from "./_lib/http.js";
import { validatePartner, hasErrors } from "./_lib/validate.js";
import { checkRateLimit, recordAttempt } from "./_lib/rateLimit.js";

/**
 * Richiesta di partnership.
 *
 * Non serve essere autenticati: un'azienda che vuole diventare partner non
 * ha ancora un account. Questo pero' la rende un endpoint pubblico scrivibile,
 * quindi qui il rate limiting non e' un optional.
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

  const { errors, data } = validatePartner(body);
  if (hasErrors(errors)) return json(req, res, 422, { errors });

  // Soglia bassa: e' un form di contatto, chi ne ha bisognio ne usa uno solo.
  const limit = await checkRateLimit(req, "partner", data.email);
  if (!limit.allowed) {
    return json(
      req,
      res,
      429,
      { error: "Hai gia' inviato una richiesta di recente." },
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  try {
    await sql()`
      insert into partner_requests (first_name, last_name, company, email, phone, message, privacy_accepted)
      values (${data.first_name}, ${data.last_name}, ${data.company}, ${data.email}, ${data.phone}, ${data.message}, ${data.privacy_accepted})
    `;
  } catch (error) {
    console.error("partner request failed", error);
    return json(req, res, 500, { error: "Invio non riuscito. Riprova." });
  }

  await recordAttempt(req, "partner", data.email);

  return json(req, res, 201, {
    ok: true,
    message: "Richiesta inviata. Ti contatteremo appena possibile.",
  });
}
