import { EVENT_ART } from "./eventArt.generated";
import { asset } from "@/lib/asset";

/**
 * Libreria delle copertine evento.
 *
 * Le immagini sono generate da `scripts/gen-event-art.mjs`, che scrive anche il
 * manifest tipizzato in `eventArt.generated.ts`: qui si arricchisce solo con le
 * etichette leggibili e con la risoluzione del base path di Vite.
 */

/** Palette disponibili, nell'ordine con cui il generatore le cicla. */
export type EventArtMood = "ciano" | "arancio" | "rosso" | "ghiaccio" | "doppio";

export interface EventArt {
  id: string;
  title: string;
  /** Percorso assoluto dentro `public/`: va passato ad `asset()`. */
  src: string;
  /** Scena, 1..12, come commentata in gen-event-art.mjs. */
  scene: number;
  sceneLabel: string;
  mood: EventArtMood;
}

export interface EventArtOption extends EventArt {
  /** URL gia' risolto sul base path: pronto per `<img src>`. */
  url: string;
}

export const MOOD_ORDER: EventArtMood[] = ["ciano", "arancio", "rosso", "ghiaccio", "doppio"];

export const MOOD_LABELS: Record<EventArtMood, string> = {
  ciano: "Ciano",
  arancio: "Arancio",
  rosso: "Rosso",
  ghiaccio: "Ghiaccio",
  doppio: "Doppio",
};

/** Colore rappresentativo di ogni palette, per il pallino nel selettore. */
export const MOOD_SWATCH: Record<EventArtMood, string> = {
  ciano: "#25e6ff",
  arancio: "#ff7a18",
  rosso: "#ff3b3b",
  ghiaccio: "#9fe8ff",
  doppio: "#ff9a3c",
};

export const EVENT_ART_LIBRARY: EventArtOption[] = EVENT_ART.map((art) => ({
  ...art,
  url: asset(art.src),
}));

export const EVENT_ART_COUNT = EVENT_ART_LIBRARY.length;

/** Elenco delle scene in ordine, con etichetta. */
export const SCENE_OPTIONS: { scene: number; label: string }[] = (() => {
  const seen = new Map<number, string>();
  EVENT_ART_LIBRARY.forEach((art) => {
    if (!seen.has(art.scene)) seen.set(art.scene, art.sceneLabel);
  });
  return [...seen.entries()].map(([scene, label]) => ({ scene, label }));
})();

export function getEventArt(id: string): EventArtOption {
  return EVENT_ART_LIBRARY.find((art) => art.id === id) ?? EVENT_ART_LIBRARY[0];
}

export function filterEventArt(filter: { mood?: EventArtMood | null; scene?: number | null }): EventArtOption[] {
  return EVENT_ART_LIBRARY.filter(
    (art) =>
      (!filter.mood || art.mood === filter.mood) && (!filter.scene || art.scene === filter.scene),
  );
}
