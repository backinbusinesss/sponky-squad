import { asset } from "@/lib/asset";

/**
 * Dati social della pagina.
 *
 * I numeri vivono qui per un motivo preciso: GitHub Pages e' statico e non
 * puo' tenere un token. La sezione prova quindi a leggere `VITE_SOCIAL_STATS_URL`
 * (un endpoint che a sua volta chiama le Graph API di Instagram/Facebook con il
 * token server-side); se l'endpoint non c'e' cade sui valori sotto, che sono lo
 * snapshot dell'ultima sincronizzazione. Basta definire la variabile in `.env`
 * per rendere la sezione davvero live, senza toccare il componente.
 *
 * Formatto atteso dall'endpoint (JSON):
 * {
 *   "syncedAt": "2026-10-18T09:40:00+01:00",
 *   "platforms": {
 *     "instagram": { "followers": 12480, "posts": 342, "series": [..30] },
 *     "facebook":  { "followers": 8640,  "posts": 218, "series": [..30] }
 *   }
 * }
 */

export type SocialPlatformKey = "instagram" | "facebook";

export type SocialPlatform = {
  key: SocialPlatformKey;
  name: string;
  handle: string;
  href: string;
  /** Follower/pagina attuali. */
  followers: number;
  /** Delta della settimana precedente, gia' firmato. */
  followersDelta: number;
  /** Post pubblicati. */
  posts: number;
  /** Post pubblicati negli ultimi 7 giorni. */
  postsWeek: number;
  /** Tasso di interazione medio, in percentuale. */
  engagement: number;
  /** Copertura settimanale. */
  reach: number;
  /** Serie follower a cadenza giornaliera, ultimi 30 giorni (vecchio -> nuovo). */
  series: number[];
};

export type SocialStats = {
  platforms: SocialPlatform[];
  syncedAt: string;
  syncedLabel: string;
  live: boolean;
};

const SYNCED_AT = "2026-10-18T09:40:00+01:00";
const SYNCED_LABEL = "18 ott 2026 · 09:40";

const snapshotPlatforms: SocialPlatform[] = [
  {
    key: "instagram",
    name: "Instagram",
    handle: "@sponkysquad",
    href: "https://www.instagram.com/sponkysquad/",
    followers: 12480,
    followersDelta: 318,
    posts: 342,
    postsWeek: 9,
    engagement: 7.4,
    reach: 148200,
    series: [
      11912, 11934, 11961, 11958, 11987, 12014, 12042, 12039, 12071, 12104,
      12132, 12128, 12161, 12194, 12227, 12219, 12256, 12288, 12317, 12344,
      12371, 12365, 12398, 12426, 12451, 12447, 12463, 12471, 12476, 12480,
    ],
  },
  {
    key: "facebook",
    name: "Facebook",
    handle: "Sponky Squad",
    href: "https://www.facebook.com/",
    followers: 8640,
    followersDelta: 142,
    posts: 218,
    postsWeek: 4,
    engagement: 4.1,
    reach: 61400,
    series: [
      8312, 8324, 8337, 8331, 8348, 8361, 8374, 8370, 8385, 8398, 8412, 8409,
      8424, 8437, 8451, 8446, 8462, 8477, 8489, 8503, 8516, 8512, 8527, 8541,
      8556, 8552, 8571, 8594, 8617, 8640,
    ],
  },
];

/** Fallback: snapshot locale. */
export const socialSnapshot: SocialStats = {
  platforms: snapshotPlatforms,
  syncedAt: SYNCED_AT,
  syncedLabel: SYNCED_LABEL,
  live: false,
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
      return patch ? { ...platform, ...patch, series: patch.series ?? platform.series } : platform;
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
