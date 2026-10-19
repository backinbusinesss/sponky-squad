import { RIDING_STYLES, DISCOUNT_INTERESTS, AGE_RANGES, GROUP_NAMES } from "@/data/options";

export { RIDING_STYLES, DISCOUNT_INTERESTS, AGE_RANGES, GROUP_NAMES };

/**
 * Base URL dell'API.
 *
 * Il sito vive su GitHub Pages, l'API su Vercel: sono origini diverse, quindi
 * ogni chiamata è cross-origin. Con credentials: "include" i cookie HttpOnly
 * vengono inviati, ma serve che l'API risponda con Access-Control-Allow-Origin
 * esatto per quell'origine (già configurato lato server).
 *
 * In sviluppo (Vite) il fallback punta al server locale; in produzione va
 * impostata VITE_API_BASE sull'URL del deploy Vercel.
 */
const fromEnv = import.meta.env.VITE_API_BASE as string | undefined;

export const API_BASE = (fromEnv ?? "").replace(/\/+$/, "");

/** Percorso assoluto dell'endpoint, con il base davanti. */
function url(path: string) {
  return `${API_BASE}${path}`;
}

/**
 * Token CSRF, tenuto in memoria.
 *
 * Il sito vive su github.io e l'API su vercel.app: sono origini diverse, e
 * `document.cookie` sul sito non vede i cookie dell'API. Il token arriva
 * quindi nel corpo delle risposte di accesso (login, registrazione, /api/me) e
 * resta qui. La lettura del cookie resta come rete di sicurezza per quando
 * front e API condividono l'origine (sviluppo locale).
 *
 * Va rimandato nell'header X-CSRF-Token: insieme al cookie è la prova che la
 * richiesta parte dal nostro front e non da un sito terzo.
 */
let csrfToken = "";

function readCsrfFromCookie(): string {
  const match = document.cookie.match(/(?:^|;\s*)sponky_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function csrf(): string {
  return csrfToken || readCsrfFromCookie();
}

/** Tiene il token dalle risposte che lo contengono (le altre non lo hanno). */
function rememberCsrf(payload: unknown) {
  const value = (payload as { csrfToken?: unknown } | null)?.csrfToken;
  if (typeof value === "string" && value) csrfToken = value;
}

export class ApiError extends Error {
  status: number;
  errors: Record<string, string>;

  constructor(status: number, message: string, errors: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
}

/**
 * Chiamata centrale a ogni endpoint.
 *
 * Le richieste che mutano stato (POST/PATCH) mandano sempre l'header CSRF:
 * senza, il server risponde 403 prima ancora di guardare il corpo. Questo copre
 * sia CSRF sia il caso in cui un utente loggato visiti un link malevolo.
 */
async function send<T>(path: string, options: RequestOptions): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = {};

  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") headers["X-CSRF-Token"] = csrf();

  let response: Response;
  try {
    response = await fetch(url(path), {
      method,
      headers,
      credentials: "include",
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    // Rete assente o API non raggiungibile: un errore distinto dai 4xx,
    // cosi' il messaggio all'utente puo' dire "controlla la connessione".
    throw new ApiError(0, "Impossibile contattare il server. Riprova.");
  }

  let data: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const payload = (data ?? {}) as { error?: string; errors?: Record<string, string> };
    throw new ApiError(
      response.status,
      payload.error ?? `Errore ${response.status}.`,
      payload.errors ?? {},
    );
  }

  rememberCsrf(data);
  return data as T;
}

/**
 * Chiamata centrale a ogni endpoint.
 *
 * Le richieste che mutano stato (POST/PATCH/DELETE) mandano sempre l'header
 * CSRF: senza, il server risponde 403 prima ancora di guardare il corpo.
 *
 * Se il token in memoria e' vecchio (per esempio un'altra scheda ha riaperto la
 * sessione) il server risponde 403: si riallinea una volta sola e si riprova,
 * cosi' all'utente non arriva un errore che si risolverebbe ricaricando.
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await send<T>(path, options);
  } catch (error) {
    const method = options.method ?? "GET";
    if (error instanceof ApiError && error.status === 403 && method !== "GET") {
      if (await syncCsrf()) return await send<T>(path, options);
    }
    throw error;
  }
}

/** Rilegge il token CSRF dalla sessione in corso. false se non c'e' sessione. */
async function syncCsrf(): Promise<boolean> {
  try {
    const response = await fetch(url("/api/me"), { credentials: "include" });
    if (!response.ok) return false;
    const data = (await response.json()) as { csrfToken?: unknown };
    if (typeof data?.csrfToken !== "string" || !data.csrfToken) return false;
    csrfToken = data.csrfToken;
    return true;
  } catch {
    return false;
  }
}

export interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  cap: string;
  ageRange: string;
  cardNumber: number;
  groupName: string;
  ridingStyles: string[];
  discountInterests: string[];
  newsletter: boolean;
  memberId: string;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: string;
}

export interface MemberCard {
  cardNumber: number;
  memberId: string;
  holderName: string;
  group: string;
  ageRange: string;
  ridingStyles: string[];
  discountInterests: string[];
  cap: string;
  issuedAt: string;
}

/** Contenuti gestiti dalla dashboard: eventi, domande e catalogo partner. */
export interface ContentEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  graphicId: string;
  linkUrl: string | null;
  linkText: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ContentFaq {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ContentPartner {
  id: string;
  title: string;
  imageUrl: string | null;
  description: string;
  location: string;
  tags: string[];
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export type ContentType = "events" | "faq" | "partners";

export interface SiteContent {
  admin: boolean;
  events: ContentEvent[];
  faqs: ContentFaq[];
  partners: ContentPartner[];
}

export interface RegistrationInput {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  cap: string;
  age_range: string;
  group_name: string;
  card_number: number;
  riding_styles: string[];
  discount_interests: string[];
  newsletter: boolean;
  privacy_accepted: boolean;
}

export interface PartnerInput {
  first_name: string;
  last_name: string;
  company: string;
  email: string;
  phone: string;
  message: string;
  privacy_accepted: boolean;
}

export const api = {
  register: (body: RegistrationInput) =>
    request<{ ok: true; user: PublicUser }>("/api/register", { method: "POST", body }),

  login: (body: { email: string; password: string }) =>
    request<{ ok: true; user: PublicUser }>("/api/login", { method: "POST", body }),

  logout: () => request<{ ok: true }>("/api/logout", { method: "POST" }),

  me: () => request<{ user: PublicUser }>("/api/me"),

  updateAccount: (body: {
    firstName: string;
    lastName: string;
    cap: string;
    ageRange: string;
    groupName: string;
    ridingStyles: string[];
    discountInterests: string[];
    newsletter: boolean;
    currentPassword?: string;
    newPassword?: string;
  }) => request<{ ok: true; user: PublicUser }>("/api/account", { method: "POST", body }),

  partner: (body: PartnerInput) =>
    request<{ ok: true; message: string }>("/api/partner", { method: "POST", body }),

  adminLogin: (body: { username: string; password: string }) =>
    request<{ ok: true; user: PublicUser }>("/api/admin/login", { method: "POST", body }),

  adminUsers: (query: { page?: number; size?: number; q?: string } = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.size) params.set("size", String(query.size));
    if (query.q) params.set("q", query.q);
    return request<{ users: PublicUser[]; total: number; active: number; page: number; pageSize: number }>(
      `/api/admin/users?${params.toString()}`,
    );
  },

  adminToggleUser: (id: string, isActive: boolean) =>
    request<{ ok: true; isActive: boolean }>(`/api/admin/users?id=${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { isActive },
    }),

  adminStats: () =>
    request<{ failedLast24h: Record<string, number> }>("/api/admin/stats"),

  adminPartners: () =>
    request<{
      requests: {
        id: string;
        firstName: string;
        lastName: string;
        company: string;
        email: string;
        phone: string;
        message: string;
        status: string;
        createdAt: string;
      }[];
      pending: number;
    }>("/api/admin/partners"),

  adminReviewPartner: (id: string, status: "approved" | "rejected") =>
    request<{ ok: true }>(`/api/admin/partners?id=${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { status },
    }),

  adminTestRegistration: (overrides: Record<string, unknown> = {}) =>
    request<{
      ok: boolean;
      errors: Record<string, string> | null;
      account: Record<string, unknown> | null;
      card: MemberCard | null;
    }>("/api/content?action=test", { method: "POST", body: overrides }),

  /**
   * Contenuti del sito. Senza sessione admin arrivano solo gli elementi
   * attivi: e' la stessa chiamata che alimenta le sezioni pubbliche.
   */
  content: () => request<SiteContent>("/api/content"),

  adminCreateContent: (type: ContentType, body: Record<string, unknown>) =>
    request<{ ok: true; item: ContentEvent | ContentFaq | ContentPartner }>(
      `/api/content?type=${type}`,
      { method: "POST", body },
    ),

  adminUpdateContent: (type: ContentType, id: string, body: Record<string, unknown>) =>
    request<{ ok: true; item: ContentEvent | ContentFaq | ContentPartner }>(
      `/api/content?type=${type}&id=${encodeURIComponent(id)}`,
      { method: "PATCH", body },
    ),

  adminDeleteContent: (type: ContentType, id: string) =>
    request<{ ok: true }>(`/api/content?type=${type}&id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
};
