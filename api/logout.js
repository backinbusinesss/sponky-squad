import { json, handleCors } from "./_lib/http.js";
import { clearSessionCookies } from "./_lib/auth.js";

/**
 * Logout.
 *
 * Il token JWT e' valido fino a scadenza anche dopo il logout: non esiste
 * un posto "dove cancellarlo" lato server, perche' il server non tiene
 * traccia delle sessioni. Questo endpoint cancella il cookie, che e'
 * sufficiente nella pratica: il browser smette di inviarlo.
 *
 * Per una revoca reale c'e' token_version sull'utente: incrementandola,
 * tutti i token emessi prima diventano invalidi al prossimo controllo.
 */
export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "POST") return json(req, res, 405, { error: "Metodo non consentito." });
  clearSessionCookies(res);
  return json(req, res, 200, { ok: true });
}
