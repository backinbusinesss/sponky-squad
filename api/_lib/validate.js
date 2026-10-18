import { CARD_MAX, CARD_MIN, RIDING_STYLES, DISCOUNT_INTERESTS, AGE_RANGES, GROUP_NAMES } from "./options.js";
import { normaliseEmail } from "./http.js";

/**
 * Validazione dei campi. Ogni regola ha una ragione pratica:
 * non e' burocrazia, e' il punto in cui un input dannoso viene fermato
 * prima di toccare il database.
 */

export const MAX_NAME = 60;
export const MAX_MESSAGE = 2000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Le password accettate in ingresso vengono sempre troncate: bcrypt ignora oltre i 72 byte. */
export const PASSWORD_MAX = 72;

export function cleanText(value, max) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function validateRegistration(body) {
  const errors = {};
  const first = cleanText(body.first_name, MAX_NAME);
  const last = cleanText(body.last_name, MAX_NAME);
  const email = normaliseEmail(body.email);
  const password = String(body.password ?? "");
  const cap = cleanText(body.cap, 10);
  const ageRange = cleanText(body.age_range, 10);
  const groupName = cleanText(body.group_name, 120);
  const cardRaw = body.card_number;

  if (first.length < 2) errors.first_name = "Inserisci il nome.";
  if (last.length < 2) errors.last_name = "Inserisci il cognome.";
  if (!EMAIL_RE.test(email) || email.length > 254) errors.email = "Indirizzo email non valido.";
  if (password.length < 8) errors.password = "La password deve avere almeno 8 caratteri.";
  if (password.length > PASSWORD_MAX) errors.password = "Password troppo lunga.";
  if (!/^\d{5}$/.test(cap)) errors.cap = "Il CAP deve avere 5 cifre.";
  if (!AGE_RANGES.some((a) => a.value === ageRange)) errors.age_range = "Seleziona una fascia d'eta'.";

  const card = Number(cardRaw);
  if (!Number.isInteger(card) || card < CARD_MIN || card > CARD_MAX) {
    errors.card_number = `Il numero tessera deve essere fra ${CARD_MIN} e ${CARD_MAX}.`;
  }
  if (!GROUP_NAMES.includes(groupName)) errors.group_name = "Gruppo non riconosciuto.";

  const styles = pickAllowed(body.riding_styles, RIDING_STYLES.map((s) => s.value));
  const discounts = pickAllowed(body.discount_interests, DISCOUNT_INTERESTS.map((d) => d.value));

  if (body.privacy_accepted !== true) {
    errors.privacy_accepted = "Devi accettare la Privacy Policy.";
  }

  return {
    errors,
    data: {
      first_name: first,
      last_name: last,
      email,
      password,
      cap,
      age_range: ageRange,
      group_name: groupName,
      card_number: card,
      riding_styles: styles,
      discount_interests: discounts,
      newsletter: body.newsletter === true,
      privacy_accepted: body.privacy_accepted === true,
    },
  };
}

export function validateLogin(body) {
  const errors = {};
  const email = normaliseEmail(body.email);
  const password = String(body.password ?? "");
  if (!email) errors.email = "Inserisci l'email.";
  if (!password) errors.password = "Inserisci la password.";
  return { errors, data: { email, password } };
}

export function validatePartner(body) {
  const errors = {};
  const first = cleanText(body.first_name, MAX_NAME);
  const last = cleanText(body.last_name, MAX_NAME);
  const company = cleanText(body.company, 120);
  const email = normaliseEmail(body.email);
  const phone = cleanText(body.phone, 30);
  const message = cleanText(body.message, MAX_MESSAGE);

  if (first.length < 2) errors.first_name = "Inserisci il nome.";
  if (last.length < 2) errors.last_name = "Inserisci il cognome.";
  if (company.length < 2) errors.company = "Inserisci il nome dell'azienda.";
  if (!EMAIL_RE.test(email)) errors.email = "Indirizzo email non valido.";
  if (!/^[+\d][\d\s()-]{5,}$/.test(phone)) errors.phone = "Numero di telefono non valido.";
  if (message.length < 10) errors.message = "Scrivi qualcosa di piu' dettagliato.";
  if (body.privacy_accepted !== true) errors.privacy_accepted = "Devi accettare la Privacy Policy.";

  return {
    errors,
    data: { first_name: first, last_name: last, company, email, phone, message, privacy_accepted: true },
  };
}

/**
 * Mantiene solo i valori che esistono davvero nell'elenco.
 * Un array arrivato dal client non va mai dato per buono: potrebbe contenere
 * qualsiasi stringa, e finirebbe cosi' com'era nel database.
 */
function pickAllowed(input, allowed) {
  if (!Array.isArray(input)) return [];
  const set = new Set(allowed);
  return [...new Set(input.filter((v) => set.has(v)))];
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
