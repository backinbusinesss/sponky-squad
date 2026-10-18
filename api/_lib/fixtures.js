import { sql } from "./http.js";

/**
 * Dati di prova per il form di registrazione.
 *
 * I valori di riding_styles, discount_interests, age_range e group_name
 * devono stare tutti nella lista di options.js: la stessa validazione
 * che riceve il form reale viene usata anche qui, altrimenti il test non
 * proverebbe la strada che proverebbe un utente vero.
 */
export const SAMPLE_MEMBERSHIP = {
  first_name: "Marco",
  last_name: "Rossi",
  email: "marco.rossi@example.com",
  cap: "20121",
  age_range: "25-35",
  group_name: "Gli Sbiellati",
  riding_styles: ["sportivo", "raduni-eventi"],
  discount_interests: ["abbigliamento", "accessori-moto", "corsi"],
  newsletter: true,
  privacy_accepted: true,
  card_number: 42,
};

/**
 * Costruisce l'oggetto tessera mostrato in /account.
 *
 * Il numero tessera e il codice membro sono gli unici campi che un utente
 * vede e che non sono la sua email: sono cio' che rende la tessera un
 * oggetto personale invece di una riga di database.
 */
export function buildCard(user) {
  return {
    cardNumber: user.cardNumber ?? user.card_number ?? null,
    memberId: user.memberId ?? user.member_id ?? null,
    holderName: `${user.firstName ?? user.first_name ?? ""} ${user.lastName ?? user.last_name ?? ""}`.trim(),
    group: user.groupName ?? user.group_name ?? "Nessun gruppo",
    ageRange: user.ageRange ?? user.age_range ?? "",
    ridingStyles: user.ridingStyles ?? user.riding_styles ?? [],
    discountInterests: user.discountInterests ?? user.discount_interests ?? [],
    cap: user.cap ?? "",
    issuedAt: user.createdAt ?? user.created_at ?? null,
  };
}

/** Legge un utente per email, senza mai toccare password_hash. */
export async function findUserByEmail(email) {
  const rows = await sql`
    select id, first_name, last_name, email, cap, age_range, card_number,
           group_name, riding_styles, discount_interests, newsletter,
           member_id, is_active, is_admin, created_at, token_version
    from users
    where lower(email) = ${String(email).toLowerCase()}
    limit 1
  `;
  return rows[0] ?? null;
}
