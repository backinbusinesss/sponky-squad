import { sql, json } from "./http.js";
import { getSession } from "./auth.js";

/**
 * Verifica che la richiesta arrivi da un account amministratore attivo.
 *
 * Non basta controllare il claim "admin" dentro il token: un token puo'
 * essere firma-valido e comunque vecchio. Se il flag is_admin viene
 * rimosso, il token continua a dire "admin" fino a scadenza. Confrontiamo
 * con il valore corrente sul database.
 */
export async function requireAdmin(req, res) {
  const session = getSession(req);
  if (!session) {
    json(req, res, 401, { error: "Devi effettuare l'accesso." });
    return null;
  }

  if (typeof session.tv !== "number") {
    json(req, res, 401, { error: "Sessione non valida." });
    return null;
  }

  let rows = [];
  try {
    rows = await sql`
      select id, first_name, last_name, token_version, is_admin, is_active
      from users
      where id = ${session.sub}
      limit 1
    `;
  } catch (error) {
    console.error("requireAdmin query failed", error);
    json(req, res, 500, { error: "Verifica non riuscita." });
    return null;
  }

  const user = rows[0];
  if (!user) {
    json(req, res, 401, { error: "Sessione non valida." });
    return null;
  }

  if (user.token_version !== session.tv) {
    json(req, res, 401, { error: "Sessione scaduta. Accedi di nuovo." });
    return null;
  }

  if (!user.is_admin || !user.is_active) {
    json(req, res, 403, { error: "Accesso negato." });
    return null;
  }

  return user;
}
