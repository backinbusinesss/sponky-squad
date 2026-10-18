import { sql, json, handleCors } from "../_lib/http.js";
import { requireAdmin } from "../_lib/adminGuard.js";

/**
 * Elenco utenti per la dashboard admin.
 *
 * password_hash non viene mai selezionato, nemmeno per poi cancellarlo:
 * il campo resta nel database e basta. Ogni richiesta in piu' che tocca quel
 * campo e' un rischio inutile.
 */
export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") return json(req, res, 405, { error: "Metodo non consentito." });

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const page = Math.max(Number.parseInt(String(req.query?.page ?? "1"), 10) || 1, 1);
  const pageSize = Math.min(Math.max(Number.parseInt(String(req.query?.size ?? "50"), 10) || 50, 1), 200);
  const offset = (page - 1) * pageSize;
  const search = String(req.query?.q ?? "").trim().toLowerCase();

  try {
    const where = search
      ? sql`where lower(first_name) like ${`%${search}%`}
            or lower(last_name) like ${`%${search}%`}
            or lower(email) like ${`%${search}%`}
            or lower(member_id) like ${`%${search}%`}`
      : sql``;

    const rows = await sql`
      select id, first_name, last_name, email, cap, age_range, card_number,
             group_name, riding_styles, discount_interests, newsletter,
             member_id, is_active, is_admin, created_at
      from users
      ${where}
      order by created_at desc
      limit ${pageSize} offset ${offset}
    `;

    const totalRows = await sql`select count(*)::int as total from users ${where}`;
    const activeRows = await sql`select count(*)::int as total from users where is_active = true`;

    return json(req, res, 200, {
      users: rows.map(toPublic),
      total: totalRows[0]?.total ?? 0,
      active: activeRows[0]?.total ?? 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("admin users failed", error);
    return json(req, res, 500, { error: "Lettura utenti non riuscita." });
  }
}

function toPublic(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    cap: row.cap,
    ageRange: row.age_range,
    cardNumber: row.card_number,
    groupName: row.group_name,
    ridingStyles: row.riding_styles ?? [],
    discountInterests: row.discount_interests ?? [],
    newsletter: row.newsletter,
    memberId: row.member_id,
    isActive: row.is_active,
    isAdmin: row.is_admin,
    createdAt: row.created_at,
  };
}
