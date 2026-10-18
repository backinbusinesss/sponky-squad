import { json, handleCors, readJsonBody } from "../_lib/http.js";
import { requireAdmin } from "../_lib/adminGuard.js";
import { SAMPLE_MEMBERSHIP } from "../_lib/fixtures.js";
import { validateRegistration, hasErrors } from "../_lib/validate.js";

/**
 * Pulsante "TEST REGISTRAZIONE" della dashboard.
 *
 * Non crea nulla: prova il form reale con dati fittizi e restituisce
 * l'anteprima di account e tessera che l'utente vedrebbe dopo l'iscrizione.
 * Serve a controllare che campi, liste e tessera siano coerenti senza
 * sporcare il database con account di prova.
 */
export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "POST") return json(req, res, 405, { error: "Metodo non consentito." });

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return json(req, res, 400, { error: "Corpo non valido." });
  }

  const { errors, data } = validateRegistration({ ...SAMPLE_MEMBERSHIP, ...body });

  if (hasErrors(errors)) {
    return json(req, res, 200, { ok: false, errors, card: null });
  }

  return json(req, res, 200, {
    ok: true,
    errors: null,
    account: {
      ...data,
      password: undefined,
      memberId: "SS-DEMO-0000",
    },
    card: {
      cardNumber: data.card_number,
      memberId: "SS-DEMO-0000",
      holderName: `${data.first_name} ${data.last_name}`,
      group: data.group_name,
      ageRange: data.age_range,
      ridingStyles: data.riding_styles,
      discountInterests: data.discount_interests,
      cap: data.cap,
      issuedAt: new Date().toISOString(),
    },
  });
}
