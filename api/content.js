import {
  sql,
  json,
  handleCors,
  readJsonBody,
  parseTextArray,
} from "./_lib/http.js";
import { requireAdmin } from "./_lib/adminGuard.js";
import { getSession, csrfOk } from "./_lib/auth.js";
import { PARTNER_TAGS } from "./_lib/options.js";
import { SAMPLE_MEMBERSHIP } from "./_lib/fixtures.js";
import { validateRegistration, hasErrors } from "./_lib/validate.js";

/**
 * Contenuti del sito: eventi, domande frequenti e catalogo partner.
 *
 * Un solo endpoint per tre risorse (limite di 12 funzioni del piano Hobby):
 *  - GET pubblico: restituisce solo cio' che e' attivo, per le sezioni del sito;
 *    se chi chiama e' un admin loggato arrivano anche i bozze/nascosti, cosi'
 *    la dashboard non ha bisogno di un secondo giro di chiamate.
 *  - POST/PATCH/DELETE: riservati all'admin, con doppio controllo CSRF.
 *  - POST ?action=test: il pulsante "TEST REGISTRAZIONE" della dashboard,
 *    assorbito qui per non consumare una funzione intera.
 */

const TYPES = new Set(["events", "faq", "partners"]);

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  try {
    if (req.method === "GET") return await handleGet(req, res);
    if (req.method === "POST") return await handlePost(req, res);
    if (req.method === "PATCH") return await handlePatch(req, res);
    if (req.method === "DELETE") return await handleDelete(req, res);
    return json(req, res, 405, { error: "Metodo non consentito." });
  } catch (error) {
    console.error("content handler failed", error);
    return json(req, res, 500, { error: "Operazione non riuscita." });
  }
}

/* ------------------------------------------------------------------ GET -- */

/**
 * Verifica admin senza scrivere nulla nella risposta: il GET pubblico deve
 * poter fallire la verifica in silenzio e restare comunque pubblico.
 */
async function quietAdmin(req) {
  const session = getSession(req);
  if (!session) return false;
  try {
    const rows = await sql()`
      select is_admin, is_active, token_version
      from users
      where id = ${session.sub}
      limit 1
    `;
    const user = rows[0];
    return Boolean(
      user && user.is_admin && user.is_active && user.token_version === session.tv,
    );
  } catch {
    return false;
  }
}

async function handleGet(req, res) {
  const admin = await quietAdmin(req);

  // Un solo filtro per tutti e tre i tipi: `admin` arriva come parametro, non
  // come pezzo di SQL. Nessuna stringa di query si costruisce a mano, quindi
  // non esiste un punto in cui possa entrare SQL injection.
  const db = sql();

  const events = await db`
    select id, title, description, event_date, location, graphic_id,
           link_url, link_text, is_active, created_at
    from events
    where (${admin}::boolean or is_active = true)
    order by event_date asc
    limit 200
  `;

  const faqs = await db`
    select id, question, answer, sort_order, is_active
    from faq_items
    where (${admin}::boolean or is_active = true)
    order by sort_order asc, created_at asc
    limit 300
  `;

  const partners = await db`
    select id, title, image_url, description, location, tags, sort_order,
           is_active, created_at
    from partners_content
    where (${admin}::boolean or is_active = true)
    order by sort_order asc, created_at asc
    limit 300
  `;

  return json(req, res, 200, {
    admin,
    events: events.map(toEvent),
    faqs: faqs.map(toFaq),
    partners: partners.map(toPartner),
  });
}

/* ---------------------------------------------------------------- POST -- */

async function handlePost(req, res) {
  // Pulsante TEST REGISTRAZIONE della dashboard.
  if (req.query?.action === "test") {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (!csrfOk(req)) return json(req, res, 403, { error: "Token di sicurezza non valido." });

    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return json(req, res, 400, { error: "Corpo non valido." });
    }

    const { errors, data } = validateRegistration({ ...SAMPLE_MEMBERSHIP, ...body });
    if (hasErrors(errors)) return json(req, res, 200, { ok: false, errors, card: null });

    return json(req, res, 200, {
      ok: true,
      errors: null,
      account: { ...data, password: undefined, memberId: "SS-DEMO-0000" },
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

  const guard = await writeGuard(req, res);
  if (!guard) return;

  const type = String(req.query?.type ?? "");
  if (!TYPES.has(type)) return json(req, res, 400, { error: "Tipo di contenuto non valido." });

  let body;
  try {
    body = await readJsonBody(req, 64 * 1024);
  } catch {
    return json(req, res, 400, { error: "Corpo non valido." });
  }

  if (type === "events") {
    const { errors, data } = validateEvent(body);
    if (hasErrors(errors)) return json(req, res, 422, { error: "Dati non validi.", errors });
    const rows = await sql()`
      insert into events (title, description, event_date, location, graphic_id, link_url, link_text, is_active)
      values (${data.title}, ${data.description}, ${data.date}, ${data.location},
              ${data.graphicId}, ${data.linkUrl}, ${data.linkText}, ${data.isActive})
      returning id, title, description, event_date, location, graphic_id,
                link_url, link_text, is_active, created_at
    `;
    return json(req, res, 201, { ok: true, item: toEvent(rows[0]) });
  }

  if (type === "faq") {
    const { errors, data } = validateFaq(body);
    if (hasErrors(errors)) return json(req, res, 422, { error: "Dati non validi.", errors });
    const rows = await sql()`
      insert into faq_items (question, answer, sort_order, is_active)
      values (${data.question}, ${data.answer},
              (select coalesce(max(sort_order), 0) + 1 from faq_items), ${data.isActive})
      returning id, question, answer, sort_order, is_active
    `;
    return json(req, res, 201, { ok: true, item: toFaq(rows[0]) });
  }

  const { errors, data } = validatePartnerContent(body);
  if (hasErrors(errors)) return json(req, res, 422, { error: "Dati non validi.", errors });
  const rows = await sql()`
    insert into partners_content (title, image_url, description, location, tags, sort_order, is_active)
    values (${data.title}, ${data.imageUrl}, ${data.description}, ${data.location},
            ${data.tags}::text[], (select coalesce(max(sort_order), 0) + 1 from partners_content), ${data.isActive})
    returning id, title, image_url, description, location, tags, sort_order, is_active, created_at
  `;
  return json(req, res, 201, { ok: true, item: toPartner(rows[0]) });
}

/* --------------------------------------------------------------- PATCH -- */

async function handlePatch(req, res) {
  const guard = await writeGuard(req, res);
  if (!guard) return;

  const type = String(req.query?.type ?? "");
  const id = String(req.query?.id ?? "");
  if (!TYPES.has(type)) return json(req, res, 400, { error: "Tipo di contenuto non valido." });
  if (!isUuid(id)) return json(req, res, 400, { error: "Id non valido." });

  let body;
  try {
    body = await readJsonBody(req, 64 * 1024);
  } catch {
    return json(req, res, 400, { error: "Corpo non valido." });
  }

  // Prima si legge la riga attuale, poi si applicano solo i campi arrivati:
  // un PATCH parziale non azzera i campi non menzionati.
  if (type === "events") {
    const current = await sql()`select * from events where id = ${id} limit 1`;
    if (!current[0]) return json(req, res, 404, { error: "Evento non trovato." });
    const { errors, data } = validateEvent({ ...toEventForm(current[0]), ...body });
    if (hasErrors(errors)) return json(req, res, 422, { error: "Dati non validi.", errors });
    const rows = await sql()`
      update events
      set title = ${data.title}, description = ${data.description},
          event_date = ${data.date}, location = ${data.location},
          graphic_id = ${data.graphicId}, link_url = ${data.linkUrl},
          link_text = ${data.linkText}, is_active = ${data.isActive},
          updated_at = now()
      where id = ${id}
      returning id, title, description, event_date, location, graphic_id,
                link_url, link_text, is_active, created_at
    `;
    return json(req, res, 200, { ok: true, item: toEvent(rows[0]) });
  }

  if (type === "faq") {
    const current = await sql()`select * from faq_items where id = ${id} limit 1`;
    if (!current[0]) return json(req, res, 404, { error: "Domanda non trovata." });
    const { errors, data } = validateFaq({
      question: current[0].question,
      answer: current[0].answer,
      is_active: current[0].is_active,
      ...body,
    });
    if (hasErrors(errors)) return json(req, res, 422, { error: "Dati non validi.", errors });
    const rows = await sql()`
      update faq_items
      set question = ${data.question}, answer = ${data.answer},
          is_active = ${data.isActive}, updated_at = now()
      where id = ${id}
      returning id, question, answer, sort_order, is_active
    `;
    return json(req, res, 200, { ok: true, item: toFaq(rows[0]) });
  }

  const current = await sql()`select * from partners_content where id = ${id} limit 1`;
  if (!current[0]) return json(req, res, 404, { error: "Partner non trovato." });
  const { errors, data } = validatePartnerContent({
    ...toPartnerForm(current[0]),
    ...body,
  });
  if (hasErrors(errors)) return json(req, res, 422, { error: "Dati non validi.", errors });
  const rows = await sql()`
    update partners_content
    set title = ${data.title}, image_url = ${data.imageUrl},
        description = ${data.description}, location = ${data.location},
        tags = ${data.tags}::text[], is_active = ${data.isActive},
        updated_at = now()
    where id = ${id}
    returning id, title, image_url, description, location, tags, sort_order, is_active, created_at
  `;
  return json(req, res, 200, { ok: true, item: toPartner(rows[0]) });
}

/* -------------------------------------------------------------- DELETE -- */

async function handleDelete(req, res) {
  const guard = await writeGuard(req, res);
  if (!guard) return;

  const type = String(req.query?.type ?? "");
  const id = String(req.query?.id ?? "");
  if (!TYPES.has(type)) return json(req, res, 400, { error: "Tipo di contenuto non valido." });
  if (!isUuid(id)) return json(req, res, 400, { error: "Id non valido." });

  if (type === "events") {
    const rows = await sql()`delete from events where id = ${id} returning id`;
    if (!rows[0]) return json(req, res, 404, { error: "Evento non trovato." });
    return json(req, res, 200, { ok: true });
  }

  if (type === "faq") {
    const rows = await sql()`delete from faq_items where id = ${id} returning id`;
    if (!rows[0]) return json(req, res, 404, { error: "Domanda non trovata." });
    return json(req, res, 200, { ok: true });
  }

  const rows = await sql()`delete from partners_content where id = ${id} returning id`;
  if (!rows[0]) return json(req, res, 404, { error: "Partner non trovato." });
  return json(req, res, 200, { ok: true });
}

/* --------------------------------------------------------------- utils -- */

/** Admin + CSRF: due controlli distinti, entrambi necessari. */
async function writeGuard(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return false;
  if (!csrfOk(req)) {
    json(req, res, 403, { error: "Token di sicurezza non valido. Ricarica la pagina." });
    return false;
  }
  return true;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function clean(value, max) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function optionalUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (raw.length > 500) return null;
  if (/^https?:\/\/\S+$/i.test(raw)) return raw;
  if (/^#[\w-]+$/.test(raw)) return raw;
  return null;
}

function validateEvent(body) {
  const errors = {};
  const title = clean(body.title, 120);
  const description = String(body.description ?? "").trim().slice(0, 2000);
  const location = clean(body.location, 120);
  const graphicId = clean(body.graphicId, 40);
  const linkText = clean(body.linkText, 60);
  const linkUrl = optionalUrl(body.linkUrl);
  const dateRaw = String(body.date ?? "");
  const date = new Date(dateRaw);

  if (title.length < 2) errors.title = "Inserisci il titolo.";
  if (!location) errors.location = "Inserisci il luogo.";
  if (Number.isNaN(date.getTime())) errors.date = "Data non valida.";
  // Le grafiche sono generate dal sito: un id sconosciuto non troverebbe immagine.
  if (!/^art-\d{2}$/.test(graphicId)) errors.graphicId = "Seleziona una grafica.";
  if (body.linkUrl && !linkUrl) errors.linkUrl = "Link non valido (usa http:// o https://).";

  return {
    errors,
    data: {
      title,
      description,
      location,
      graphicId,
      linkText,
      linkUrl,
      date: Number.isNaN(date.getTime()) ? null : date.toISOString(),
      isActive: body.isActive !== false,
    },
  };
}

function validateFaq(body) {
  const errors = {};
  const question = clean(body.question, 300);
  const answer = String(body.answer ?? "").trim().slice(0, 4000);

  if (question.length < 3) errors.question = "Inserisci la domanda.";
  if (answer.length < 2) errors.answer = "Inserisci la risposta.";

  return {
    errors,
    data: { question, answer, isActive: body.isActive !== false },
  };
}

function validatePartnerContent(body) {
  const errors = {};
  const title = clean(body.title, 120);
  const description = String(body.description ?? "").trim().slice(0, 2000);
  const location = clean(body.location, 120);
  const imageUrl = optionalUrl(body.imageUrl);

  if (title.length < 2) errors.title = "Inserisci il titolo.";
  if (description.length < 2) errors.description = "Inserisci la descrizione.";
  if (body.imageUrl && !imageUrl) errors.imageUrl = "Immagine non valida (usa un URL http:// o https://).";

  // Solo i tag della lista ufficiale passano: il resto viene scartato.
  const allowed = new Set(PARTNER_TAGS);
  const tags = [...new Set((Array.isArray(body.tags) ? body.tags : []).map((t) => String(t)))].filter((t) =>
    allowed.has(t),
  );

  return {
    errors,
    data: {
      title,
      description,
      location,
      imageUrl,
      tags,
      isActive: body.isActive !== false,
    },
  };
}

function toEvent(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    date: row.event_date,
    location: row.location,
    graphicId: row.graphic_id,
    linkUrl: row.link_url ?? null,
    linkText: row.link_text ?? null,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

/** Riga evento -> forma attesa da validateEvent, per il merge del PATCH. */
function toEventForm(row) {
  const mapped = toEvent(row);
  return {
    title: mapped.title,
    description: mapped.description,
    date: mapped.date,
    location: mapped.location,
    graphicId: mapped.graphicId,
    linkUrl: mapped.linkUrl ?? "",
    linkText: mapped.linkText ?? "",
    isActive: mapped.isActive,
  };
}

function toFaq(row) {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

function toPartner(row) {
  return {
    id: row.id,
    title: row.title,
    imageUrl: row.image_url ?? null,
    description: row.description ?? "",
    location: row.location ?? "",
    tags: parseTextArray(row.tags),
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function toPartnerForm(row) {
  const mapped = toPartner(row);
  return {
    title: mapped.title,
    description: mapped.description,
    location: mapped.location,
    imageUrl: mapped.imageUrl ?? "",
    tags: mapped.tags,
    isActive: mapped.isActive,
  };
}
