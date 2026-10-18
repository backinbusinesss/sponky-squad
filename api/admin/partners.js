import { sql, json, handleCors } from "../_lib/http.js";
import { requireAdmin } from "../_lib/adminGuard.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") return json(req, res, 405, { error: "Metodo non consentito." });

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const rows = await sql`
      select id, first_name, last_name, company, email, phone, message,
             status, created_at, reviewed_at
      from partner_requests
      order by created_at desc
      limit 200
    `;

    const pending = await sql`
      select count(*)::int as total from partner_requests where status = 'pending'
    `;

    return json(req, res, 200, {
      requests: rows.map(toPublic),
      pending: pending[0]?.total ?? 0,
    });
  } catch (error) {
    console.error("admin partner requests failed", error);
    return json(req, res, 500, { error: "Lettura richieste non riuscita." });
  }
}

function toPublic(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}
