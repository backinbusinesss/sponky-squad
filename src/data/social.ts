import { asset } from "@/lib/asset";

/**
 * Dati social della pagina.
 *
 * Regola: qui entrano solo numeri che si possono leggere da un profilo
 * pubblico. GitHub Pages e' statico e non puo' tenere un token, quindi la
 * sezione prova a leggere `VITE_SOCIAL_STATS_URL` (un endpoint che a sua volta
 * chiama le Graph API); se l'endpoint non c'e' cade sui valori sotto, che sono
 * lo snapshot della data in `readAt`.
 *
 * Le serie a 30 giorni, il delta settimanale, la copertura e l'engagement non
 * si leggono da un profilo pubblico: non vengono mai inventati, compaiono solo
 * se li fornisce l'endpoint live. Senza endpoint la scheda mostra i fatti
 * verificabili e basta.
 *
 * Formato atteso dall'endpoint (JSON):
 * {
 *   "syncedAt": "2026-10-18T09:40:00+01:00",
 *   "platforms": {
 *     "instagram": { "metric": 14400, "series": [..30], "followersDelta": 318, ... },
 *     "facebook":  { "metric": 267,   "series": [..30], ... }
 *   }
 * }
 *
 * Numeri verificati il 18 ott 2026 sul profilo pubblico:
 *   instagram.com/sponkysquad  -> 14,4K follower, 985 post, 424 seguiti
 *   facebook.com/groups/427025827080072 -> gruppo pubblico, 267 membri
 *   (i due link sono quelli che sponkysquad.it espone come social ufficiali)
 */

export type SocialPlatformKey = "instagram" | "facebook";

export type SocialFact = { label: string; value: string };

export type SocialPlatform = {
  key: SocialPlatformKey;
  name: string;
  handle: string;
  href: string;
  /** "Pagina" per Instagram, "Gruppo pubblico" per Facebook. */
  kind: string;
  /** Etichetta del numero grande: "Follower" per una pagina, "Membri" per un gruppo. */
  metricLabel: string;
  /** Numero grande, gia' verificato sul profilo pubblico. */
  metric: number;
  /** Secondo numero grande (i post) dove esiste; un gruppo non ne ha. */
  secondary?: SocialFact;
  /** Fatti verificabili mostrati come chip (seguiti, tipo, ...). */
  facts: SocialFact[];
  /** Analisi: compaiono solo se arrivate dall'endpoint live. */
  series?: number[];
  followersDelta?: number;
  engagement?: number;
  reach?: number;
};

export type SocialStats = {
  platforms: SocialPlatform[];
  syncedAt: string;
  syncedLabel: string;
  /** true solo quando i numeri arrivano dall'endpoint, non dallo snapshot. */
  live: boolean;
  /** Data in cui lo snapshot e' stato letto dal profilo pubblico. */
  readAt: string;
};

const READ_AT = "18 ott 2026";

const snapshotPlatforms: SocialPlatform[] = [
  {
    key: "instagram",
    name: "Instagram",
    handle: "@sponkysquad",
    href: "https://www.instagram.com/sponkysquad/",
    kind: "Pagina",
    metricLabel: "Follower",
    metric: 14400,
    secondary: { label: "Post", value: "985" },
    facts: [
      { label: "Seguiti", value: "424" },
      { label: "Tipo", value: "Pagina" },
    ],
  },
  {
    key: "facebook",
    name: "Facebook",
    handle: "SponkySquad",
    href: "https://www.facebook.com/groups/427025827080072",
    kind: "Gruppo pubblico",
    metricLabel: "Membri",
    metric: 267,
    facts: [
      { label: "Visibilita'", value: "Pubblica" },
      { label: "Tipo", value: "Gruppo" },
    ],
  },
];

/** Fallback: snapshot letto dai profili pubblici. */
export const socialSnapshot: SocialStats = {
  platforms: snapshotPlatforms,
  syncedAt: new Date().toISOString(),
  syncedLabel: `${READ_AT} · profilo pubblico`,
  live: false,
  readAt: READ_AT,
};

type LivePayload = {
  syncedAt?: string;
  syncedLabel?: string;
  platforms?: Partial<Record<SocialPlatformKey, Partial<SocialPlatform>>>;
};

const LIVE_URL = import.meta.env.VITE_SOCIAL_STATS_URL as string | undefined;

/**
 * Prova a prendere i numeri veri; se l'endpoint manca, non e' raggiungibile o
 * risponde male, resta sullo snapshot. La sezione deve sempre avere qualcosa
 * da mostrare: un social board che mostra uno spinner non e' un social board.
 */
export async function loadSocialStats(): Promise<SocialStats> {
  if (!LIVE_URL) {
    return socialSnapshot;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const response = await fetch(LIVE_URL, { signal: controller.signal });
    clearTimeout(timer);

    if (!response.ok) {
      return socialSnapshot;
    }

    const payload = (await response.json()) as LivePayload;
    const platforms = snapshotPlatforms.map((platform) => {
      const patch = payload.platforms?.[platform.key];
      return patch ? { ...platform, ...patch, facts: patch.facts ?? platform.facts } : platform;
    });

    const syncedAt = payload.syncedAt ?? new Date().toISOString();
    return {
      platforms,
      syncedAt,
      syncedLabel:
        payload.syncedLabel ??
        new Intl.DateTimeFormat("it-IT", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(syncedAt)),
      live: true,
      readAt: READ_AT,
    };
  } catch {
    return socialSnapshot;
  }
}

export type SocialPost = {
  id: string;
  platform: SocialPlatformKey;
  caption: string;
  place: string;
  likes: number;
  comments: number;
  /** "3 h", "ieri", ... */
  ago: string;
  image: string;
};

/** Le ultime uscite, con copertine prese dal set delle 52 grafiche evento. */
export const socialPosts: SocialPost[] = [
  {
    id: "sp-1",
    platform: "instagram",
    caption: "Night pack: 40 moto, zero ritardi, un solo semaforo rosso di troppo.",
    place: "Milano → Lago di Como",
    likes: 1842,
    comments: 96,
    ago: "3 h",
    image: asset("/assets/event-art/art-01.svg"),
  },
  {
    id: "sp-2",
    platform: "facebook",
    caption: "Iscrizioni aperte per il Track Pulse a Cremona: restano 12 posti.",
    place: "Cremona Circuit",
    likes: 612,
    comments: 74,
    ago: "7 h",
    image: asset("/assets/event-art/art-10.svg"),
  },
  {
    id: "sp-3",
    platform: "instagram",
    caption: "Dolomiti in frontaliera: il briefing delle 6:00 vale la sveglia.",
    place: "Passo Giau",
    likes: 2104,
    comments: 131,
    ago: "ieri",
    image: asset("/assets/event-art/art-16.svg"),
  },
  {
    id: "sp-4",
    platform: "instagram",
    caption: "Nuova convenzione attiva per chi porta la tessera digitale.",
    place: "Partner ufficiali",
    likes: 947,
    comments: 38,
    ago: "2 gg",
    image: asset("/assets/event-art/art-07.svg"),
  },
];
