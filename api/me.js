import { sql, json, handleCors } from "./_lib/http.js";
import { getSession, clearSessionCookies } from "./_lib/auth.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") return json(req, res, 405, { error: "Metodo non consentito." });

  const session = getSession(req);
  if (!session) {
    // Il cookie e' scaduto o non valido: puliamolo, cosi' il client smette
    // di credere di avere una sessione aperta.
    clearSessionCookies(res);
    return json(req, res, 401, { error: "Sessione non valida." });
  }

  let rows = [];
  try {
    rows = await sql`
      select id, first_name, last_name, email, cap, age_range, card_number,
             group_name, riding_styles, discount_interests, newsletter,
             member_id, created_at, is_active, is_admin
      from users
      where id = ${session.sub}
      limit 1
    `;
  } catch (error) {
    console.error("me failed", error);
    return json(req, res, 500, { error: "Lettura account non riuscita." });
  }

  const user = rows[0];
  if (!user) {
    clearSessionCookies(res);
    return json(req, res, 401, { error: "Sessione non valida." });
  }

  return json(req, res, 200, {
    user: {
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
      isAdmin: Boolean(user.is_admin),
      createdAt: user.created_at,
    },
  });
}
