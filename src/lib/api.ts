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
 * Legge il cookie CSRF non-HttpOnly.
 *
 * Il server lo imposte appena si apre una sessione. Va rimandato nell'header
 * X-CSRF-Token: è la prova che chi fa la richiesta può anche leggere il cookie,
 * quindi non è un sito terzo che la sta inoltrando.
 */
function readCsrf(): string {
  const match = document.cookie.match(/(?:^|;\s*)sponky_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
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
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = {};

  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") headers["X-CSRF-Token"] = readCsrf();

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

  return data as T;
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
    }>("/api/admin/test-registration", { method: "POST", body: overrides }),
};
