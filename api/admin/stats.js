import { sql, json, handleCors } from "../_lib/http.js";
import { requireAdmin } from "../_lib/adminGuard.js";

/**
 * Contatore dei tentativi di login falliti per finestra mobile.
 * Mostrato solo agli admin: serve a capire se qualcuno sta provando a
 * forzare un account.
 */
export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") return json(req, res, 405, { error: "Metodo non consentito." });

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    const rows = await sql()`
      select scope, count(*)::int as attempts
      from login_attempts
      where attempted_at > ${since}
      group by scope
    `;
    return json(req, res, 200, {
      failedLast24h: Object.fromEntries(rows.map((r) => [r.scope, r.attempts])),
    });
  } catch (error) {
    console.error("admin stats failed", error);
    return json(req, res, 500, { error: "Lettura statistiche non riuscita." });
  }
}
