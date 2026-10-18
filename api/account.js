import { sql, json, handleCors, readJsonBody } from "./_lib/http.js";
import { getSessionFresh, csrfOk, hashPassword, verifyPassword, signSession, serializeCookie, SESSION_COOKIE } from "./_lib/auth.js";
import { CARD_MAX, CARD_MIN, RIDING_STYLES, DISCOUNT_INTERESTS, GROUP_NAMES, AGE_RANGES } from "./_lib/options.js";

/**
 * Modifica dei dati account.
 *
 * Alcuni campi non sono modificabili qui: email e numero tessera sono
 * identificativi. L'email perche' e' la credenziale di login e cambiarla
 * da un form non verificato aprirebbe un takeover; il numero tessera
 * perche' e' univoco e su un sistema reale va gestito con una procedura
 * a parte, non con un campo compilabile a piacere.
 */
export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "POST") return json(req, res, 405, { error: "Metodo non consentito." });

  const session = await getSessionFresh(req);
  if (!session) return json(req, res, 401, { error: "Devi effettuare l'accesso." });

  if (!csrfOk(req)) return json(req, res, 403, { error: "Richiesta non verificata." });

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return json(req, res, 400, { error: "Corpo della richiesta non valido." });
  }

  const errors = {};
  const first = String(body.firstName ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  const last = String(body.lastName ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  const cap = String(body.cap ?? "").trim().slice(0, 10);
  const ageRange = String(body.ageRange ?? "").trim().slice(0, 10);
  const groupName = String(body.groupName ?? "").trim().slice(0, 120);
  const newsletter = body.newsletter === true;

  if (first.length < 2) errors.firstName = "Inserisci il nome.";
  if (last.length < 2) errors.lastName = "Inserisci il cognome.";
  if (!/^\d{5}$/.test(cap)) errors.cap = "Il CAP deve avere 5 cifre.";
  if (!AGE_RANGES.some((a) => a.value === ageRange)) errors.ageRange = "Fascia d'eta' non valida.";
  if (!GROUP_NAMES.includes(groupName)) errors.groupName = "Gruppo non riconosciuto.";

  const styles = filterAllowed(body.ridingStyles, RIDING_STYLES.map((s) => s.value));
  const discounts = filterAllowed(body.discountInterests, DISCOUNT_INTERESTS.map((d) => d.value));

  // cambio password: solo se viene fornita. Vecchia e nuova entrambe richieste,
  // perche' un form che cambia password senza chiedere quella attuale e'
  // un form che un XSS puo' usare per prendere il controllo dell'account.
  const currentPw = String(body.currentPassword ?? "");
  const newPw = String(body.newPassword ?? "");
  let passwordHash = null;

  if (newPw) {
    if (!currentPw) errors.currentPassword = "Inserisci la password attuale.";
    if (newPw.length < 8) errors.newPassword = "La nuova password deve avere almeno 8 caratteri.";
    if (newPw.length > 72) errors.newPassword = "Password troppo lunga.";
  }

  if (Object.keys(errors).length > 0) {
    return json(req, res, 422, { errors });
  }

  try {
    const rows = await sql`
      select password_hash from users where id = ${session.sub} limit 1
    `;
    if (!rows[0]) return json(req, res, 401, { error: "Account non trovato." });

    if (newPw) {
      const ok = await verifyPassword(currentPw, rows[0].password_hash);
      if (!ok) {
        return json(req, res, 403, {
          errors: { currentPassword: "Password attuale non corretta." },
        });
      }
      passwordHash = await hashPassword(newPw);
    }

    // Aggiorniamo i campi in un solo passaggio. Il numero di password non
    // cambia mai: non serve alcun update condizionale dell'array, che in
    // un template letterale non e' comunque interpolabile.
    const updated = await sql`
      update users set
        first_name = ${first},
        last_name = ${last},
        cap = ${cap},
        age_range = ${ageRange},
        group_name = ${groupName},
        riding_styles = ${styles},
        discount_interests = ${discounts},
        newsletter = ${newsletter}
      where id = ${session.sub}
      returning id, first_name, last_name, email, cap, age_range, card_number,
                group_name, riding_styles, discount_interests, newsletter,
                member_id, created_at, is_active, is_admin
    `;

    // Se e' cambiata la password, i token vecchi restano validi fino a
    // scadenza. Incrementiamo token_version: ogni controllo la confronta,
    // quindi tutti i token emessi prima diventano invalidi subito.
    if (passwordHash) {
      await sql`
        update users set password_hash = ${passwordHash}, token_version = token_version + 1
        where id = ${session.sub}
      `;
    }

    const user = updated[0];

    let setCookies;
    if (passwordHash) {
      const fresh = await sql`
        select token_version from users where id = ${session.sub} limit 1
      `;
      const newToken = signSession({
        sub: session.sub,
        name: user.first_name,
        tv: fresh[0].token_version,
        admin: Boolean(user.is_admin),
      });
      setCookies = [serializeCookie(SESSION_COOKIE, newToken, {
        httpOnly: true, secure: true, sameSite: "None", path: "/", maxAge: 60 * 60 * 24 * 30,
      })];
    }

    return json(req, res, 200, { ok: true, user: publicUser(user) }, setCookies ? { "Set-Cookie": setCookies } : {});
  } catch (error) {
    console.error("account update failed", error);
    return json(req, res, 500, { error: "Salvataggio non riuscito." });
  }
}

function filterAllowed(input, allowed) {
  if (!Array.isArray(input)) return [];
  const set = new Set(allowed);
  return [...new Set(input.filter((v) => set.has(v)))];
}

function publicUser(user) {
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
    isAdmin: Boolean(user.is_admin),
    createdAt: user.created_at,
  };
}
