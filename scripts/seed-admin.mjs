import { readFileSync, existsSync } from "node:fs";
import { sql } from "../api/_lib/http.js";
import { hashPassword, makeMemberId } from "../api/_lib/auth.js";

/**
 * Carica .env senza dipendenze esterne.
 *
 * dotenv non e' nel package.json e non serve aggiungerlo per due righe:
 * si leggono le righe "CHIAVE=valor e si assegnano solo se la variabile
 * non e' gia' impostata, per non sovrascrivere gli ambientali veri.
 */
function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnv(new URL("../.env", import.meta.url).pathname);

// Password dell'amministratore.
//
// Non compare nel repository: viene letta dall'ambiente o passata a riga di
// comando. Il valore hashato finisce nel database, e il confronto avviene
// solo con bcrypt.compare — la password in chiaro non viene mai conservata.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? process.argv[2];

if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
  console.error(
    "Manca la password admin.\n" +
      "  ADMIN_PASSWORD=... node scripts/seed-admin.mjs\n" +
      "  (almeno 12 caratteri)",
  );
  process.exit(1);
}

const query = sql();

const first = process.env.ADMIN_FIRST_NAME ?? "Sponky";
const last = process.env.ADMIN_LAST_NAME ?? "Admin";
// Il login admin confronta username con email O member_id, quindi impostando
// email="admin" la credenziale letterale richiesta funziona direttamente
// nel campo username. ADMIN_EMAIL permette di usare un indirizzo vero.
const email = (process.env.ADMIN_EMAIL ?? "admin").toLowerCase();

const passwordHash = await hashPassword(ADMIN_PASSWORD);
const memberId = makeMemberId();

await query`
  insert into users (
    first_name, last_name, email, password_hash, cap, age_range,
    card_number, group_name, riding_styles, discount_interests,
    privacy_accepted, privacy_accepted_at, newsletter, member_id,
    is_active, is_admin, token_version
  ) values (
    ${first}, ${last}, ${email}, ${passwordHash}, '00000', '25-35',
    1, 'Nessun gruppo', '{}', '{}',
    true, now(), false, ${memberId},
    true, true, 1
  )
  on conflict (lower(email)) do update set
    password_hash = excluded.password_hash,
    is_admin = true,
    is_active = true,
    token_version = users.token_version + 1
  returning id, email, is_admin, member_id
`;

console.log("Amministratore pronto.");
console.log(`  email     ${email}`);
console.log(`  tessera   1`);
console.log(`  codice    ${memberId}`);
console.log("");
console.log("La password non viene mostrata ne' salvata in chiaro.");
console.log("Per cambiarla: ADMIN_PASSWORD=... node scripts/seed-admin.mjs");

process.exit(0);
