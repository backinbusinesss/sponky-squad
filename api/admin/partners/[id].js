import { sql, json, handleCors, readJsonBody } from "../../_lib/http.js";
import { requireAdmin } from "../../_lib/adminGuard.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "PATCH") return json(req, res, 405, { error: "Metodo non consentito." });

  const admin = await requireAdmin(req, res);
  if (!admin) return;

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
    const rows = await sql`
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
