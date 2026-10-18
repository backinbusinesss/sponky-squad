/**
 * Opzioni reali del vecchio form di iscruzione di sponkysquad.it.
 * Estratte dal markup del form 174: qui non c'e' niente di inventato,
 * sono le stesse voci che l'utente vedeva sul sito precedente.
 */

export const RIDING_STYLES = [
  { value: "touring", label: "Touring" },
  { value: "sportivo", label: "Sportivo" },
  { value: "motard", label: "Motard" },
  { value: "enduro-offroad", label: "Enduro / Off-road" },
  { value: "turismo-veloce", label: "Turismo veloce" },
  { value: "raduni-eventi", label: "Raduni ed eventi" },
];

export const DISCOUNT_INTERESTS = [
  { value: "abbigliamento", label: "Abbigliamento" },
  { value: "accessori-moto", label: "Accessori moto" },
  { value: "servizi", label: "Servizi" },
  { value: "esperienze", label: "Esperienze" },
  { value: "corsi", label: "Corsi" },
  { value: "hotel-ristoranti", label: "Hotel e ristoranti" },
];

export const AGE_RANGES = [
  { value: "18-25", label: "18-25" },
  { value: "25-35", label: "25-35" },
  { value: "35-45", label: "35-45" },
  { value: "45", label: "Oltre 45" },
];

/** Gruppi elencati nel campo 22 del form originale. Il primo e' "Nessun gruppo". */
export const GROUP_NAMES = [
  "Nessun gruppo",
  "''O Passu O Strassu''",
  "100CELLE Bikers",
  "ASSAS Motorcycle Club",
  "Biella Crew",
  "BikerFriends",
  "BikerGirlzMilano",
  "BQP Milano",
  "Coste&Furious",
  "Crazy Helmets",
  "Curve & Tornanti",
  "Dieci4 Riders",
  "DONNEINSELLA",
  "Fast and Bikers",
  "Forigiri Toscana Bikers",
  "Furious Girl Club",
  "Gli Ammutinati",
  "Gli Arroganti",
  "Gli Sbiellati",
  "GUZZISTI \u201cSVALVOLATI\u201d",
  "I Draghi di Hamamatsu",
  "i Nani Bastardi",
  "I RANDAGI BIKERS CLUB",
  "IngiroinMOTO",
  "Kawalieri di Akashi",
  "L\u2019TOrda dei Caschi Pavesi",
  "LadyBikerss",
  "Motocicliste in Lombardia 2023",
  "Motociclisti liberi Latina",
  "Motoclub - NightRider",
  "MotoCorse Team",
  "Motogiri 500+",
  "Murgiabikersgravina",
  "Nomadi Free Bikers",
  "North Riders",
  "POWERBIKERS Italia",
  "Quelli della SS80",
  "Raketeen Group",
  "ThrottleGoats",
  "Tra le Pigne a 200 Km/h",
  "VBC - Veneto Bikers Club",
  "Veneto Bikers",
  "YRT Milano",
];

/** Codice tessera: il vecchio form indicava "Numero (da 2 a 999)". */
export const CARD_MIN = 2;
export const CARD_MAX = 999;

/** Messaggi di errore del login, in tono da pilota. */
export const LOGIN_ERRORS = [
  "Curva sbagliata, riprova!",
  "Motore in stallo: credenziali errate",
];
