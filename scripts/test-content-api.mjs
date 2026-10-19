/**
 * Prova end-to-end dell'endpoint contenuti (eventi, domande, partner).
 *
 * Gira contro l'API di produzione perche' il database Neon non e' raggiungibile
 * in locale: qui si verifica il giro completo — GET pubblico, login admin,
 * creazione, modifica, pubblicazione/nascondi, eliminazione — con cookie e
 * token CSRF veri.
 *
 * Uso:  node scripts/test-content-api.mjs
 */

const BASE = process.env.API_BASE ?? "https://sponky-squad.vercel.app/api";
const ORIGIN = "https://backinbusinesss.github.io";

const cookies = new Map();
const results = [];

function cookieHeader() {
  return [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function call(path, { method = "GET", body, admin = false, csrf = true } = {}) {
  const headers = { Origin: ORIGIN };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (admin) headers.Cookie = cookieHeader();
  if (admin && csrf && method !== "GET") headers["X-CSRF-Token"] = cookies.get("sponky_csrf") ?? "";

  const response = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  for (const raw of response.headers.getSetCookie?.() ?? []) {
    const pair = raw.split(";")[0];
    const index = pair.indexOf("=");
    if (index === -1) continue;
    cookies.set(pair.slice(0, index).trim(), decodeURIComponent(pair.slice(index + 1).trim()));
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return { status: response.status, payload };
}

function check(label, condition, detail = "") {
  results.push({ label, ok: Boolean(condition) });
  console.log(`${condition ? "OK  " : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

const stamp = Date.now();
const eventPayload = {
  title: `Prova content ${stamp}`,
  date: new Date(Date.now() + 86400000 * 7).toISOString(),
  location: "Milano, Piazza Gae Aulenti",
  description: `Evento di prova con link [info](https://www.sponkysquad.it) — ${stamp}`,
  graphicId: "art-03",
  linkText: "Iscriviti all'evento",
  linkUrl: "https://www.sponkysquad.it",
  isActive: true,
};

console.log(`API: ${BASE}\n`);

/* 1. GET pubblico ------------------------------------------------------- */
const publicBefore = await call("/content");
check("GET pubblico risponde 200", publicBefore.status === 200, `status ${publicBefore.status}`);
check("GET pubblico non e' admin", publicBefore.payload?.admin === false);
check(
  "GET pubblico restituisce i tre elenchi",
  Array.isArray(publicBefore.payload?.events) &&
    Array.isArray(publicBefore.payload?.faqs) &&
    Array.isArray(publicBefore.payload?.partners),
);

/* 2. scrittura senza sessione ------------------------------------------- */
const anonymousWrite = await call("/content?type=events", { method: "POST", body: eventPayload });
check("POST senza login respinto (401)", anonymousWrite.status === 401, `status ${anonymousWrite.status}`);

/* 3. login admin -------------------------------------------------------- */
const login = await call("/admin/login", {
  method: "POST",
  body: { username: "admin", password: "SponkySponky26!" },
});
check("login admin riuscito", login.status === 200 && login.payload?.ok === true, `status ${login.status}`);
check("cookie di sessione e CSRF ricevuti", cookies.has("sponky_session") && cookies.has("sponky_csrf"));
check(
  "il login restituisce il token CSRF anche nel corpo",
  typeof login.payload?.csrfToken === "string" &&
    login.payload.csrfToken.length > 20 &&
    login.payload.csrfToken === cookies.get("sponky_csrf"),
  "il sito e' su un'altra origine e non puo' leggere il cookie",
);

/* 4. scrittura senza token CSRF ---------------------------------------- */
const noCsrf = await call("/content?type=events", {
  method: "POST",
  body: eventPayload,
  admin: true,
  csrf: false,
});
check("POST admin senza CSRF respinto (403)", noCsrf.status === 403, `status ${noCsrf.status}`);

/* 5. GET da admin: vede anche i nascosti ------------------------------- */
const adminView = await call("/content", { admin: true });
check("GET da admin ha admin: true", adminView.payload?.admin === true);

const me = await call("/me", { admin: true });
check(
  "GET /api/me restituisce il token CSRF della sessione",
  typeof me.payload?.csrfToken === "string" && me.payload.csrfToken === cookies.get("sponky_csrf"),
  "serve al front dopo un ricaricamento di pagina, quando la memoria e' vuota",
);

/* 6. CRUD evento -------------------------------------------------------- */
const created = await call("/content?type=events", { method: "POST", body: eventPayload, admin: true });
const eventId = created.payload?.item?.id;
check("creazione evento (201)", created.status === 201 && Boolean(eventId), `status ${created.status}`);
check("evento salvato con grafica e link", created.payload?.item?.graphicId === "art-03" && created.payload?.item?.linkUrl === eventPayload.linkUrl);
check("evento salvato con la data giusta", created.payload?.item?.date === eventPayload.date, created.payload?.item?.date);

const patched = await call(`/content?type=events&id=${eventId}`, {
  method: "PATCH",
  body: { location: "Torino, Piazza Castello" },
  admin: true,
});
check(
  "PATCH parziale conserva gli altri campi",
  patched.status === 200 &&
    patched.payload?.item?.location === "Torino, Piazza Castello" &&
    patched.payload?.item?.title === eventPayload.title,
  `status ${patched.status}`,
);

const badLink = await call(`/content?type=events&id=${eventId}`, {
  method: "PATCH",
  body: { linkUrl: "javascript:alert(1)" },
  admin: true,
});
check("link javascript: respinto (422)", badLink.status === 422, `status ${badLink.status}`);

const badGraphic = await call("/content?type=events", {
  method: "POST",
  body: { ...eventPayload, graphicId: "art-99-nonexistent" },
  admin: true,
});
check("grafica inesistente respinta (422)", badGraphic.status === 422, `status ${badGraphic.status}`);

/* 7. CRUD domanda ------------------------------------------------------- */
const faqCreated = await call("/content?type=faq", {
  method: "POST",
  body: {
    question: `Domanda di prova ${stamp}?`,
    answer: `Risposta con link [sito ufficiale](https://www.sponkysquad.it) e nudo https://www.sponkysquad.it — ${stamp}`,
    isActive: true,
  },
  admin: true,
});
const faqId = faqCreated.payload?.item?.id;
check("creazione domanda (201)", faqCreated.status === 201 && Boolean(faqId), `status ${faqCreated.status}`);
check("domanda con sort_order assegnato", typeof faqCreated.payload?.item?.sortOrder === "number");

/* 8. CRUD partner ------------------------------------------------------- */
const partnerCreated = await call("/content?type=partners", {
  method: "POST",
  body: {
    title: `Partner di prova ${stamp}`,
    imageUrl: "https://www.sponkysquad.it/logo.png",
    description: "Sconto di prova riservato ai soci.",
    location: "Bologna",
    tags: ["Food", "Community", "Tag inventato"],
    isActive: true,
  },
  admin: true,
});
const partnerId = partnerCreated.payload?.item?.id;
check("creazione partner (201)", partnerCreated.status === 201 && Boolean(partnerId), `status ${partnerCreated.status}`);
check(
  "tag filtrati sulla lista ufficiale (2 su 3)",
  Array.isArray(partnerCreated.payload?.item?.tags) &&
    partnerCreated.payload.item.tags.length === 2 &&
    partnerCreated.payload.item.tags.includes("Food"),
  JSON.stringify(partnerCreated.payload?.item?.tags),
);

/* 9. visibilita' pubblica ---------------------------------------------- */
const publicMid = await call("/content");
check("evento creato visibile al pubblico", publicMid.payload?.events?.some((e) => e.id === eventId));
check("domanda creata visibile al pubblico", publicMid.payload?.faqs?.some((f) => f.id === faqId));
check("partner creato visibile al pubblico", publicMid.payload?.partners?.some((p) => p.id === partnerId));

const hidden = await call(`/content?type=partners&id=${partnerId}`, {
  method: "PATCH",
  body: { isActive: false },
  admin: true,
});
check("partner nascosto dall'admin", hidden.status === 200 && hidden.payload?.item?.isActive === false);

const publicAfterHide = await call("/content");
check("partner nascosto non compare al pubblico", !publicAfterHide.payload?.partners?.some((p) => p.id === partnerId));
check(
  "l'admin continua a vederlo",
  (await call("/content", { admin: true })).payload?.partners?.some((p) => p.id === partnerId),
);

/* 10. TEST REGISTRAZIONE ----------------------------------------------- */
const testOk = await call("/content?action=test", { method: "POST", body: {}, admin: true });
check("TEST REGISTRAZIONE valido risponde ok", testOk.status === 200 && testOk.payload?.ok === true, `status ${testOk.status}`);
check("TEST REGISTRAZIONE restituisce la tessera demo", testOk.payload?.card?.memberId === "SS-DEMO-0000");

const testBad = await call("/content?action=test", {
  method: "POST",
  body: { first_name: "", email: "non-una-email" },
  admin: true,
});
check("TEST REGISTRAZIONE con dati rotti elenca gli errori", testBad.payload?.ok === false && Boolean(testBad.payload?.errors));

/* 11. pulizia ----------------------------------------------------------- */
for (const [type, id] of [
  ["events", eventId],
  ["faq", faqId],
  ["partners", partnerId],
]) {
  const removed = await call(`/content?type=${type}&id=${id}`, { method: "DELETE", admin: true });
  check(`eliminazione ${type}`, removed.status === 200, `status ${removed.status}`);
}

const missing = await call(`/content?type=events&id=${eventId}`, { method: "DELETE", admin: true });
check("eliminare due volte da 404", missing.status === 404, `status ${missing.status}`);

const publicEnd = await call("/content");
check(
  "nessun residuo visibile al pubblico",
  !publicEnd.payload?.events?.some((e) => e.id === eventId) &&
    !publicEnd.payload?.faqs?.some((f) => f.id === faqId),
);

/* 12. logout ------------------------------------------------------------ */
const logout = await call("/logout", { method: "POST", admin: true });
check("logout riuscito", logout.status === 200 || logout.status === 204, `status ${logout.status}`);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} controlli superati.`);
if (failed.length) {
  console.log("Controlli falliti:");
  for (const item of failed) console.log(` - ${item.label}`);
  process.exit(1);
}
