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

export type InstagramPost = {
  id: string;
  /** Permalink pubblico del post: e' l'embed ufficiale di Instagram a renderlo. */
  url: string;
  /**
   * Inizio della didascalia reale del post (letta dal post il 19 ott 2026).
   * Serve solo come rete di sicurezza: se l'embed non riesce a disegnarsi —
   * succede quando il browser blocca i contenuti di terze parti — la scheda
   * resta leggibile invece di mostrare un riquadro vuoto.
   */
  caption: string;
};

/**
 * Post reali del profilo @sponkysquad, dal piu' recente (ordine verificato
 * sull'account il 19 ott 2026). Niente contenuti inventati: didascalia,
 * immagine e like li serve Instagram dentro l'embed ufficiale, quindi restano
 * corretti anche fra sei mesi. Per cambiare la selezione basta sostituire i link
 * (tutti verificati pubblici e attivi) e riportare la didascalia accanto.
 */
export const instagramPosts: InstagramPost[] = [
  {
    id: "ig-1",
    url: "https://www.instagram.com/reel/Deg66YhuNUa/",
    caption: "FESTA DI NATALE 2026 \u{1F385} Info e iscrizioni : sponkysquad.it",
  },
  {
    id: "ig-2",
    url: "https://www.instagram.com/p/DefCYuVEVUg/",
    caption: "Idea : Trekking Fotografico \u{1F631} \u{1F4F8} Ci sono posti che sembrano usciti da una cartolina\u2026",
  },
  {
    id: "ig-3",
    url: "https://www.instagram.com/p/DePgbKPEXUR/",
    caption: "FESTA DI NATALE 2026 \u{1F385} Il 2026 ci ha regalato chilometri, curve, amicizie, risate, eventi\u2026",
  },
  {
    id: "ig-4",
    url: "https://www.instagram.com/p/Dd_Yxn1ETEH/",
    caption: "\u{1F3CD}\uFE0F SponkySquad sta cercando nuovi commerciali in tutta Italia. Siamo una piattaforma di servizi\u2026",
  },
];
