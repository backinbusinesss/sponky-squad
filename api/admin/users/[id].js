import { sql, json, handleCors, readJsonBody } from "../../_lib/http.js";
import { requireAdmin } from "../../_lib/adminGuard.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "PATCH") return json(req, res, 405, { error: "Metodo non consentito." });

  const admin = await requireAdmin(req, res);
  if (!admin) return;

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
    const rows = await sql`
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
