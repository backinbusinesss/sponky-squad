import { sql, json, readJsonBody } from "./http.js";

/**
 * Attivazione/disattivazione utente. Sposta qui da api/admin/users/[id].js
 * per ridurre il numero di Serverless Functions (limite 12 sul piano Hobby).
 * La logica non cambia: e' lo stesso handler, solo chiamato da un dispatch.
 */
export async function toggleUser(req, res, admin) {
  const targetId = String(req.query?.id ?? "");
  if (!targetId) return json(req, res, 400, { error: "Manca l'identificativo." });

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return json(req, res, 400, { error: "Corpo non valido." });
  }

  if (targetId === admin.id) {
    return json(req, res, 400, { error: "Non puoi disattivare il tuo stesso account." });
  }

  // Attivazione/disattivazione. L'admin non puo' modificare altro: un form
  // che permettesse di cambiare email o numero tessera a un altro utente
  // aprirebbe un modo di prendere il controllo di un account.
  try {
    const rows = await sql()`
      update users
      set is_active = ${body.isActive === true}
      where id = ${targetId}
      returning id, is_active
    `;
    if (!rows[0]) return json(req, res, 404, { error: "Utente non trovato." });
    return json(req, res, 200, { ok: true, isActive: rows[0].is_active });
  } catch (error) {
    console.error("admin toggle failed", error);
    return json(req, res, 500, { error: "Aggiornamento non riuscito." });
  }
}

/**
 * Revisione di una richiesta partner. Sposta qui da api/admin/partners/[id].js
 * per lo stesso motivo del limite funzioni.
 */
export async function reviewPartner(req, res) {
  const id = String(req.query?.id ?? "");
  if (!id) return json(req, res, 400, { error: "Manca l'identificativo." });

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return json(req, res, 400, { error: "Corpo non valido." });
  }

  const status = String(body.status ?? "");
  if (!["approved", "rejected"].includes(status)) {
    return json(req, res, 422, { error: "Stato non valido." });
  }

  try {
    const rows = await sql()`
      update partner_requests
      set status = ${status}, reviewed_at = now()
      where id = ${id}
      returning id, status, reviewed_at
    `;
    if (!rows[0]) return json(req, res, 404, { error: "Richiesta non trovata." });
    return json(req, res, 200, { ok: true, request: rows[0] });
  } catch (error) {
    console.error("admin partner review failed", error);
    return json(req, res, 500, { error: "Aggiornamento non riuscito." });
  }
}
