/**
 * Generatore delle copertine evento in stile Sponky Squad.
 *
 * Produce 52 copertine uniche in public/assets/event-art/<slug>.svg,
 * tutte costruite sullo stesso lessico visivo del sito (notte blu profondo,
 * neon ciano/arancione/rosso, strada bagnata in prospettiva, scie in
 * lunga esposizione, vignettatura). Ogni copertina e' la combinazione di
 * un tema di scena con una delle varianti di luce e composizione, quindi
 * il risultato non si ripete anche quando il soggetto coincide.
 *
 * Uso: node scripts/gen-event-art.mjs
 */
import fs from "node:fs";
import path from "node:path";

const W = 720;
const H = 900;
const OUT_DIR = "public/assets/event-art";
const MANIFEST_OUT = "src/data/eventArt.generated.ts";

/** PRNG deterministico: la stessa sequenza a ogni esecuzione. */
function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

const rnd = (rng, a, b) => a + rng() * (b - a);
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];
const f = (n) => Math.round(n * 10) / 10;

/** Neoni della casa: stesso triade usato in HeroSection e CustomCursor. */
const NEON = {
  cyan: "#19E6FF",
  orange: "#FF7A18",
  red: "#FF2F2F",
  white: "#EAF6FF",
  ice: "#BDF6FF",
};

/** Varianti di luce: cambiano il colore dominante della scena. */
const MOODS = [
  { key: "ciano", neon: NEON.cyan, haze: "#0d3d4d", streak: NEON.cyan },
  { key: "arancio", neon: NEON.orange, haze: "#4d2608", streak: NEON.orange },
  { key: "rosso", neon: NEON.red, haze: "#4d0d12", streak: NEON.red },
  { key: "ghiaccio", neon: NEON.ice, haze: "#12303d", streak: NEON.ice },
  { key: "doppio", neon: NEON.orange, haze: "#3d1a20", streak: NEON.cyan },
];

/** Skyline: profili di palazzi, generati dal PRNG. */
function skyline(rng, y0, y1, fill, opacity) {
  const segs = [];
  let x = -20;
  while (x < W + 20) {
    const w = rnd(rng, 40, 110);
    const h = rnd(rng, 40, y1 - y0);
    segs.push(`M${f(x)} ${f(y1)}V${f(y1 - h)}H${f(x + w)}V${f(y1)}Z`);
    x += w;
  }
  return `<path d="${segs.join("")}" fill="${fill}" opacity="${opacity}"/>`;
}

/** Finestre accese: piccoli rettangoli sparsi nel cielo. */
function windows(rng, color, count, top, bottom) {
  const cells = [];
  for (let i = 0; i < count; i += 1) {
    const x = rnd(rng, 20, W - 30);
    const y = rnd(rng, top, bottom);
    const lit = rng() > 0.42;
    cells.push(
      `<rect x="${f(x)}" y="${f(y)}" width="7" height="10" rx="1" fill="${lit ? color : "#0A0C15"}" opacity="${lit ? f(rnd(rng, 0.45, 0.9)) : "0.6"}"/>`,
    );
  }
  return cells.join("");
}

/** Insegne neon: rettangoli con alone, come in community-night-ride. */
function neonSigns(rng, mood, count) {
  const glow = [];
  const lines = [];
  for (let i = 0; i < count; i += 1) {
    const x = rnd(rng, 40, W - 150);
    const y = rnd(rng, 250, 430);
    const w = rnd(rng, 60, 120);
    const h = rnd(rng, 22, 44);
    const c = rng() > 0.5 ? mood.neon : pick(rng, [NEON.cyan, NEON.orange, NEON.red]);
    const r = f(rnd(rng, 6, 9));
    glow.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${r}" stroke="${c}" stroke-width="4" fill="none" filter="url(#artBlur8)"/>`);
    lines.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${r}" stroke="${c}" stroke-width="3" fill="none"/>`);
  }
  return `<g opacity=".9">${glow.join("")}</g>${lines.join("")}`;
}

/**
 * Strada bagnata in prospettiva: il soggetto di ogni scena.
 * vx/vy e' il punto di fuga, che sposta l'inquadratura e rende ogni
 * composizione diversa dall'altra.
 */
function road(vx, vy, mood) {
  const b = H;
  const near = 900; // ampiezza della carreggiata in basso
  const far = 30;
  const parts = [];
  parts.push(
    `<path d="M${f(vx - far)} ${f(vy)}H${f(vx + far)}L${f(vx + near)} ${b}H${f(vx - near)}Z" fill="url(#artRoad)"/>`,
  );
  // Bordi corsia. Al 20% di bianco pieno diventano un taglio grigio che
  // attraversa il fotogramma e, nel varco fra pilota e scocca, si affaccia
  // come una freccia luminosa: si tengono appena percettibili.
  parts.push(`<path d="M${f(vx - far + 2)} ${f(vy + 4)}L${f(vx - near * 0.72)} ${b}H${f(vx - near * 0.94)}L${f(vx - far - 2)} ${f(vy + 4)}Z" fill="${NEON.white}" opacity=".085"/>`);
  parts.push(`<path d="M${f(vx + far - 2)} ${f(vy + 4)}L${f(vx + near * 0.94)} ${b}H${f(vx + near * 0.72)}L${f(vx + far + 2)} ${f(vy + 4)}Z" fill="${NEON.white}" opacity=".07"/>`);
  // asse tratteggiato in prospettiva
  for (let i = 0; i < 4; i += 1) {
    const t0 = i / 4;
    const t1 = t0 + 0.16;
    const y0 = vy + (b - vy) * (t0 * t0 * 0.9 + t0 * 0.1);
    const y1 = vy + (b - vy) * (t1 * t1 * 0.9 + t1 * 0.1);
    const w0 = 5 + 46 * t0 * t0;
    const w1 = 5 + 46 * t1 * t1;
    parts.push(`<path d="M${f(vx - w0 / 2)} ${f(y0)}h${f(w0)}l${f((w1 - w0) / 2)} ${f(y1 - y0)}h${f(-w1)}Z" fill="${NEON.white}" opacity="${f(0.5 - i * 0.06)}"/>`);
  }
  // riflessi verticali sul bagnato
  parts.push(`<rect x="${f(vx - near * 0.86)}" y="${f(vy + 40)}" width="18" height="${f(b - vy - 40)}" fill="${mood.neon}" opacity=".35" filter="url(#artBlur8)"/>`);
  parts.push(`<rect x="${f(vx + near * 0.7)}" y="${f(vy + 70)}" width="14" height="${f(b - vy - 70)}" fill="${NEON.red}" opacity=".28" filter="url(#artBlur8)"/>`);
  return parts.join("");
}

/** Scie di luce in lunga esposizione orizzontali. */
function streaks(rng, mood) {
  const parts = [];
  const n = 4 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i += 1) {
    const y = rnd(rng, 300, 820);
    const w = rnd(rng, 200, 420);
    const x = rnd(rng, -60, W - 120);
    const h = rnd(rng, 6, 16);
    const c = rng() > 0.45 ? mood.streak : pick(rng, [NEON.orange, NEON.red, NEON.cyan]);
    parts.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(h / 2)}" fill="url(#artStreak)" opacity="${f(rnd(rng, 0.55, 0.95))}" filter="url(#artBlur3)"/>`);
  }
  return parts.join("");
}

/** Tagliorruote: cerchio, raggi e disco freno. */
function wheel(cx, cy, r, mood) {
  const spokes = [];
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    spokes.push(
      `<path d="M${f(cx)} ${f(cy)}L${f(cx + Math.cos(a) * r * 0.78)} ${f(cy + Math.sin(a) * r * 0.78)}" stroke="#1A1D27" stroke-width="${f(r * 0.3)}" stroke-linecap="round"/>`,
    );
  }
  return `<g>
    <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="#05060A" stroke="#171A24" stroke-width="${f(r * 0.34)}"/>
    ${spokes.join("")}
    <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.88)}" fill="none" stroke="${mood.neon}" stroke-width="${f(r * 0.09)}" opacity=".95"/>
    <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.5)}" fill="none" stroke="${NEON.red}" stroke-width="${f(r * 0.1)}" opacity=".75"/>
    <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.17)}" fill="${NEON.white}" opacity=".92"/>
    <path d="M${f(cx - r * 0.62)} ${f(cy - r * 0.55)}A${f(r * 0.84)} ${f(r * 0.84)} 0 0 1 ${f(cx + r * 0.16)} ${f(cy - r * 0.82)}" stroke="${NEON.white}" stroke-width="${f(r * 0.08)}" fill="none" opacity=".45"/>
  </g>`;
}

/**
 * Superbike di profilo con pilota chinato.
 * Proporzioni reali: passo ruote = 2, raggio ruota = 0.45 (660mm su 1420mm),
 * altezza sella ~1.14, sbalzo del codone. Il tracciato e' scritto a mano e
 * non interpolato: senza le concavita' sella/serbatoio la sagoma appassisce
 * e somiglia a uno scooter.
 */
function superbike(cx, cy, s, mood, flip, rider = false) {
  if (process.env.NO_RIDER) rider = false;
  const t = flip ? -1 : 1;
  const px = (x) => f(cx + t * x * s);
  const py = (y) => f(cy - y * s);
  const g = [];

  // ombra di contatto
  g.push(`<ellipse cx="${px(0)}" cy="${py(0)}" rx="${f(1.36 * s)}" ry="${f(0.16 * s)}" fill="#000000" opacity=".62" filter="url(#artBlur20)"/>`);

  // forcellone
  g.push(`<path d="M${px(-1.0)} ${py(0.45)}L${px(-0.34)} ${py(0.58)}" stroke="#272C3B" stroke-width="${f(0.15 * s)}" stroke-linecap="round"/>`);

  // forcella anteriore: disegnata PRIMA della carena, cosi' si vede solo nel
  // varco fra ruota e lamiera — e' il dettaglio che lega l'anteriore al
  // telaio invece di sembrare un'asta appiccicata sopra.
  g.push(`<path d="M${px(1.0)} ${py(0.45)}L${px(0.9)} ${py(1.34)}" stroke="#DCEBF5" stroke-width="${f(0.07 * s)}" stroke-linecap="round" opacity=".55"/>`);

  // Profilo superbike costruito per sottrazione rispetto alle ruote: il
  // bordo inferiore deve passare FUORI dalla corona delle due ruote (o poco
  // dentro, davanti, per dare profondita'), altrimenti le ruote ritagliano
  // la carena e la sagoma diventa uninsulaire. Tre vuoti obbligatori: coda
  // che sfiora la ruota posteriore, lama che sfiora l'anteriore, aria sotto
  // il motore tra le due.
  const body = `M${px(1.42)} ${py(1.18)}
    Q${px(1.24)} ${py(1.44)} ${px(1.06)} ${py(1.52)}
    Q${px(0.94)} ${py(1.42)} ${px(0.8)} ${py(1.36)}
    C${px(0.58)} ${py(1.46)} ${px(0.12)} ${py(1.48)} ${px(-0.02)} ${py(1.34)}
    C${px(-0.12)} ${py(1.26)} ${px(-0.26)} ${py(1.16)} ${px(-0.44)} ${py(1.16)}
    C${px(-0.6)} ${py(1.16)} ${px(-0.7)} ${py(1.2)} ${px(-0.82)} ${py(1.24)}
    L${px(-1.46)} ${py(1.52)}
    L${px(-1.52)} ${py(1.3)}
    C${px(-1.36)} ${py(1.1)} ${px(-1.18)} ${py(1.0)} ${px(-0.92)} ${py(0.98)}
    C${px(-0.8)} ${py(0.94)} ${px(-0.7)} ${py(0.86)} ${px(-0.62)} ${py(0.76)}
    C${px(-0.56)} ${py(0.62)} ${px(-0.5)} ${py(0.5)} ${px(-0.4)} ${py(0.44)}
    L${px(-0.1)} ${py(0.37)}
    L${px(0.26)} ${py(0.39)}
    C${px(0.42)} ${py(0.48)} ${px(0.54)} ${py(0.58)} ${px(0.68)} ${py(0.7)}
    C${px(0.88)} ${py(0.85)} ${px(1.06)} ${py(0.96)} ${px(1.42)} ${py(1.18)} Z`;
  g.push(`<path d="${body}" fill="url(#artBody)" stroke="${mood.neon}" stroke-width="${f(0.05 * s)}" stroke-linejoin="round"/>`);
  g.push(`<path d="${body}" fill="none" stroke="${NEON.white}" stroke-width="${f(0.014 * s)}" opacity=".45"/>`);

  // linea di stile: serbatoio -> sella
  g.push(`<path d="M${px(0.66)} ${py(1.36)}C${px(0.34)} ${py(1.32)} ${px(-0.02)} ${py(1.24)} ${px(-0.6)} ${py(1.22)}" stroke="${mood.streak}" stroke-width="${f(0.034 * s)}" fill="none" stroke-linecap="round"/>`);
  // taglio del codone
  g.push(`<path d="M${px(-1.48)} ${py(1.48)}L${px(-1.2)} ${py(1.26)}" stroke="${NEON.red}" stroke-width="${f(0.055 * s)}" stroke-linecap="round" opacity=".95"/>`);
  // marmitta sotto scocca + scintille
  g.push(`<path d="M${px(-0.2)} ${py(0.44)}L${px(-0.62)} ${py(0.6)}" stroke="#2C3140" stroke-width="${f(0.13 * s)}" stroke-linecap="round"/>`);
  g.push(`<path d="M${px(-0.6)} ${py(0.6)}L${px(-1.0)} ${py(0.76)}" stroke="${mood.neon}" stroke-width="${f(0.17 * s)}" stroke-linecap="round"/>`);
  g.push(`<circle cx="${px(-1.06)}" cy="${py(0.78)}" r="${f(0.13 * s)}" fill="${NEON.orange}" filter="url(#artBlur8)"/>`);
  // pinne aerodinamiche
  g.push(`<path d="M${px(0.74)} ${py(0.86)}L${px(1.3)} ${py(0.8)}L${px(1.24)} ${py(0.98)}L${px(0.72)} ${py(1.04)}Z" fill="#0F121C" stroke="${NEON.red}" stroke-width="${f(0.022 * s)}"/>`);
  // Presa d'aria: gia' in neon pieno sembrava una freccia appesa al manubrio.
  // E' una presa vera e propria, quindi bocca scura con solo il labbro acceso.
  g.push(`<path d="M${px(0.68)} ${py(1.24)}L${px(1.0)} ${py(1.12)}L${px(0.9)} ${py(1.3)}Z" fill="#04050A" stroke="${mood.neon}" stroke-width="${f(0.024 * s)}" stroke-linejoin="round"/>`);
  // finestrino corto sul naso
  g.push(`<path d="M${px(1.06)} ${py(1.52)}L${px(1.12)} ${py(1.76)}L${px(0.9)} ${py(1.46)}Z" fill="${mood.neon}" opacity=".45" stroke="${NEON.white}" stroke-width="${f(0.014 * s)}"/>`);
  // faro agganciato al naso
  g.push(`<path d="M${px(1.42)} ${py(1.16)}L${px(1.74)} ${py(1.06)}L${px(1.5)} ${py(1.36)}Z" fill="${NEON.white}" opacity=".95"/>`);
  g.push(`<ellipse cx="${px(1.68)}" cy="${py(1.1)}" rx="${f(0.24 * s)}" ry="${f(0.15 * s)}" fill="${mood.neon}" filter="url(#artBlur8)" opacity=".85"/>`);

  if (rider) {
    // Pilota in tuck, ridotto e scaraventato in avanti: se resta una palla
    // si fonde con la carena e la moto sparisce. Anca sulla sella, schiena
    // come una diagonale, casco appena davanti alle spalle.
    // L'orlo di sotto (pancia e fianco) deve passare CHIARO sotto il bordo
    // alto della scocca: se il pilota resta sospeso sopra la sella resta un
    // pertugio sul quale affiora la carreggiata e sembra una freccia.
    const torso = `M${px(-0.56)} ${py(1.04)}
      C${px(-0.6)} ${py(1.3)} ${px(-0.46)} ${py(1.64)} ${px(-0.18)} ${py(1.78)}
      C${px(0.0)} ${py(1.86)} ${px(0.18)} ${py(1.84)} ${px(0.26)} ${py(1.74)}
      C${px(0.34)} ${py(1.62)} ${px(0.26)} ${py(1.46)} ${px(0.08)} ${py(1.4)}
      C${px(-0.1)} ${py(1.3)} ${px(-0.34)} ${py(1.0)} ${px(-0.56)} ${py(1.04)} Z`;
    g.push(`<g>
      <!-- gamba: anca -> ginocchio in avanti -> pedana -->
      <path d="M${px(-0.5)} ${py(1.12)}L${px(0.18)} ${py(1.04)}L${px(-0.22)} ${py(0.62)}" stroke="#070910" stroke-width="${f(0.19 * s)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M${px(-0.5)} ${py(1.12)}L${px(0.18)} ${py(1.04)}L${px(-0.22)} ${py(0.62)}" stroke="${mood.neon}" stroke-width="${f(0.024 * s)}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".5"/>
      <!-- schiena chinata -->
      <path d="${torso}" fill="url(#artBody)" stroke="${mood.neon}" stroke-width="${f(0.04 * s)}"/>
      <path d="M${px(-0.48)} ${py(1.38)}C${px(-0.32)} ${py(1.6)} ${px(-0.1)} ${py(1.74)} ${px(0.16)} ${py(1.76)}" stroke="${NEON.white}" stroke-width="${f(0.022 * s)}" fill="none" opacity=".3"/>
      <!-- braccio fino al manubrio -->
      <path d="M${px(0.24)} ${py(1.72)}L${px(1.06)} ${py(1.36)}" stroke="#070910" stroke-width="${f(0.14 * s)}" stroke-linecap="round"/>
      <path d="M${px(0.24)} ${py(1.72)}L${px(1.06)} ${py(1.36)}" stroke="${mood.streak}" stroke-width="${f(0.028 * s)}" stroke-linecap="round" opacity=".8"/>
      <!-- casco del pilota -->
      <circle cx="${px(0.5)}" cy="${py(1.94)}" r="${f(0.28 * s)}" fill="url(#artBody)" stroke="${mood.neon}" stroke-width="${f(0.042 * s)}"/>
      <path d="M${px(0.68)} ${py(2.02)}L${px(0.88)} ${py(1.92)}L${px(0.7)} ${py(1.8)}L${px(0.54)} ${py(1.82)}Z" fill="url(#artVisor)" stroke="${NEON.white}" stroke-width="${f(0.016 * s)}"/>
      <path d="M${px(0.3)} ${py(2.14)}L${px(0.6)} ${py(2.18)}" stroke="${NEON.red}" stroke-width="${f(0.085 * s)}" stroke-linecap="round"/>
      <path d="M${px(0.26)} ${py(2.0)}L${px(0.52)} ${py(2.06)}" stroke="${NEON.white}" stroke-width="${f(0.05 * s)}" stroke-linecap="round" opacity=".8"/>
    </g>`);
  }

  g.push(`<g>
    ${wheel(px(-1.0), py(0.45), 0.45 * s, mood)}
    ${wheel(px(1.0), py(0.45), 0.45 * s, mood)}
  </g>`);
  return `<g>${g.join("")}</g>`;
}

/**
 * Casco da pista di profilo: calotta rotonda, mento sporgente con presa
 * d'aria, visore ampio, banda tricolore, spoiler e cinturino.
 */
function helmet(cx, cy, s, mood) {
  const px = (x) => f(cx + x * s);
  const py = (y) => f(cy - y * s);

  const shell = `M${px(0.86)} ${py(-0.44)}
    C${px(1.0)} ${py(-0.3)} ${px(1.07)} ${py(-0.06)} ${px(1.07)} ${py(0.26)}
    C${px(1.07)} ${py(0.6)} ${px(0.88)} ${py(0.85)} ${px(0.56)} ${py(0.96)}
    C${px(0.28)} ${py(1.06)} ${px(-0.06)} ${py(1.06)} ${px(-0.36)} ${py(0.98)}
    C${px(-0.72)} ${py(0.9)} ${px(-0.99)} ${py(0.66)} ${px(-1.05)} ${py(0.3)}
    C${px(-1.09)} ${py(0.0)} ${px(-1.0)} ${py(-0.22)} ${px(-0.86)} ${py(-0.38)}
    C${px(-0.6)} ${py(-0.56)} ${px(-0.2)} ${py(-0.62)} ${px(0.16)} ${py(-0.58)}
    C${px(0.44)} ${py(-0.56)} ${px(0.7)} ${py(-0.52)} ${px(0.86)} ${py(-0.44)} Z`;

  const visor = `M${px(1.0)} ${py(0.34)}
    C${px(0.86)} ${py(0.58)} ${px(0.5)} ${py(0.7)} ${px(0.1)} ${py(0.68)}
    C${px(-0.2)} ${py(0.66)} ${px(-0.4)} ${py(0.5)} ${px(-0.44)} ${py(0.26)}
    C${px(-0.46)} ${py(0.06)} ${px(-0.3)} ${py(-0.06)} ${px(0.0)} ${py(-0.1)}
    C${px(0.4)} ${py(-0.14)} ${px(0.8)} ${py(-0.08)} ${px(0.98)} ${py(0.04)} Z`;

  return `<g>
    <ellipse cx="${px(-0.05)}" cy="${py(-0.72)}" rx="${f(1.0 * s)}" ry="${f(0.16 * s)}" fill="#000" opacity=".6" filter="url(#artBlur20)"/>
    <path d="${shell}" fill="#06080D" stroke="${mood.neon}" stroke-width="${f(0.07 * s)}" stroke-linejoin="round"/>
    <path d="${visor}" fill="url(#artVisor)" stroke="${NEON.white}" stroke-width="${f(0.03 * s)}" stroke-linejoin="round"/>
    <!-- riflessi sul visore -->
    <path d="M${px(0.9)} ${py(0.16)}C${px(0.6)} ${py(0.24)} ${px(0.2)} ${py(0.46)} ${px(-0.2)} ${py(0.5)}" stroke="#FFFFFF" stroke-width="${f(0.06 * s)}" fill="none" opacity=".45" stroke-linecap="round"/>
    <path d="M${px(0.84)} ${py(0.02)}C${px(0.56)} ${py(0.1)} ${px(0.18)} ${py(0.34)} ${px(-0.18)} ${py(0.38)}" stroke="#FFFFFF" stroke-width="${f(0.03 * s)}" fill="none" opacity=".26" stroke-linecap="round"/>
    <!-- banda tricolore sulla calotta -->
    <path d="M${px(-0.92)} ${py(0.5)}C${px(-0.6)} ${py(0.88)} ${px(0.0)} ${py(1.02)} ${px(0.6)} ${py(0.76)}" stroke="${NEON.red}" stroke-width="${f(0.14 * s)}" fill="none" stroke-linecap="round"/>
    <path d="M${px(-0.98)} ${py(0.28)}C${px(-0.66)} ${py(0.68)} ${px(-0.02)} ${py(0.82)} ${px(0.66)} ${py(0.54)}" stroke="${NEON.white}" stroke-width="${f(0.1 * s)}" fill="none" stroke-linecap="round" opacity=".9"/>
    <!-- presa d'aria del mento -->
    <path d="M${px(0.78)} ${py(-0.46)}L${px(0.24)} ${py(-0.6)}L${px(0.3)} ${py(-0.44)}L${px(0.8)} ${py(-0.32)}Z" fill="${mood.streak}" opacity=".9"/>
    <!-- presa d'aria superiore -->
    <path d="M${px(-0.3)} ${py(1.0)}L${px(0.1)} ${py(1.05)}L${px(0.08)} ${py(0.94)}L${px(-0.28)} ${py(0.9)}Z" fill="${NEON.white}" opacity=".3"/>
    <!-- chip interfono -->
    <circle cx="${px(-0.5)}" cy="${py(-0.16)}" r="${f(0.12 * s)}" fill="${mood.neon}" opacity=".9"/>
    <circle cx="${px(-0.5)}" cy="${py(-0.16)}" r="${f(0.055 * s)}" fill="#05060A"/>
    <!-- spoiler posteriore -->
    <path d="M${px(-1.02)} ${py(0.12)}L${px(-1.44)} ${py(0.02)}L${px(-1.38)} ${py(-0.26)}L${px(-0.98)} ${py(-0.24)}Z" fill="#070910" stroke="${mood.neon}" stroke-width="${f(0.042 * s)}" stroke-linejoin="round"/>
    <!-- cinturino -->
    <path d="M${px(0.34)} ${py(-0.56)}C${px(0.1)} ${py(-0.84)} ${px(-0.3)} ${py(-0.84)} ${px(-0.56)} ${py(-0.6)}" stroke="${NEON.white}" stroke-width="${f(0.05 * s)}" fill="none" opacity=".3" stroke-linecap="round"/>
  </g>`;
}

/** Curva di montagna con galleria di giri e stelle. */
function mountainCurve(rng, mood) {
  const parts = [];
  parts.push(`<path d="M0 ${f(H * 0.74)} L${f(W * 0.2)} ${f(H * 0.44)} L${f(W * 0.34)} ${f(H * 0.62)} L${f(W * 0.52)} ${f(H * 0.3)} L${f(W * 0.7)} ${f(H * 0.58)} L${f(W * 0.86)} ${f(H * 0.4)} L${f(W)} ${f(H * 0.64)} V${H} H0 Z" fill="#080A12" stroke="${mood.neon}" stroke-width="2.6" stroke-linejoin="round"/>`);
  parts.push(`<path d="M0 ${f(H * 0.74)} L${f(W * 0.2)} ${f(H * 0.44)} L${f(W * 0.34)} ${f(H * 0.62)} L${f(W * 0.52)} ${f(H * 0.3)} L${f(W * 0.7)} ${f(H * 0.58)} L${f(W * 0.86)} ${f(H * 0.4)} L${f(W)} ${f(H * 0.64)}" fill="none" stroke="${mood.streak}" stroke-width="1.2" opacity=".8"/>`);
  const stars = [];
  for (let i = 0; i < 26; i += 1) {
    stars.push(`<circle cx="${f(rnd(rng, 10, W - 10))}" cy="${f(rnd(rng, 20, H * 0.4))}" r="${f(rnd(rng, 0.7, 1.9))}" fill="#DFF7FF" opacity="${f(rnd(rng, 0.3, 0.9))}"/>`);
  }
  parts.push(stars.join(""));
  return parts.join("");
}

/** Tricolore / scia di bandiera in prospettiva. */
function flagSweep(mood) {
  return `<g opacity=".92">
    <path d="M${f(-40)} ${f(H * 0.2)} C${f(W * 0.3)} ${f(H * 0.12)} ${f(W * 0.62)} ${f(H * 0.34)} ${f(W + 40)} ${f(H * 0.22)} L${f(W + 40)} ${f(H * 0.3)} C${f(W * 0.62)} ${f(H * 0.42)} ${f(W * 0.3)} ${f(H * 0.2)} ${f(-40)} ${f(H * 0.28)} Z" fill="${NEON.green ?? '#12D67A'}" opacity=".0"/>
    <path d="M${f(-40)} ${f(H * 0.24)} C${f(W * 0.3)} ${f(H * 0.16)} ${f(W * 0.62)} ${f(H * 0.38)} ${f(W + 40)} ${f(H * 0.26)} L${f(W + 40)} ${f(H * 0.34)} C${f(W * 0.62)} ${f(H * 0.46)} ${f(W * 0.3)} ${f(H * 0.24)} ${f(-40)} ${f(H * 0.32)} Z" fill="#12D67A" opacity=".55"/>
    <path d="M${f(-40)} ${f(H * 0.3)} C${f(W * 0.3)} ${f(H * 0.22)} ${f(W * 0.62)} ${f(H * 0.44)} ${f(W + 40)} ${f(H * 0.32)} L${f(W + 40)} ${f(H * 0.4)} C${f(W * 0.62)} ${f(H * 0.52)} ${f(W * 0.3)} ${f(H * 0.3)} ${f(-40)} ${f(H * 0.38)} Z" fill="#F4F6FA" opacity=".45"/>
    <path d="M${f(-40)} ${f(H * 0.36)} C${f(W * 0.3)} ${f(H * 0.28)} ${f(W * 0.62)} ${f(H * 0.5)} ${f(W + 40)} ${f(H * 0.38)} L${f(W + 40)} ${f(H * 0.46)} C${f(W * 0.62)} ${f(H * 0.58)} ${f(W * 0.3)} ${f(H * 0.36)} ${f(-40)} ${f(H * 0.44)} Z" fill="${NEON.red}" opacity=".6"/>
    <path d="M${f(-40)} ${f(H * 0.3)} C${f(W * 0.3)} ${f(H * 0.22)} ${f(W * 0.62)} ${f(H * 0.44)} ${f(W + 40)} ${f(H * 0.32)}" fill="none" stroke="${mood.neon}" stroke-width="2.4" opacity=".9"/>
  </g>`;
}

/**
 * Temi di scena: ognuno costruisce il soggetto centrale della copertina.
 * `layer` indica se va dietro o davanti alla strada.
 */
const SCENES = [
  // 1 — moto in città di notte
  (rng, mood) => ({
    back: `${skyline(rng, 300, 560, "#070912", 0.95)}${windows(rng, mood.neon, 46, 320, 540)}${neonSigns(rng, mood, 3)}`,
    front: superbike(W * 0.5, H * 0.78, 152, mood, rng() > 0.5, true),
  }),
  // 2 — pista: curva + bandiera
  (rng, mood) => ({
    back: `${flagSweep(mood)}${skyline(rng, 340, 540, "#070912", 0.8)}`,
    front: `${superbike(W * 0.49, H * 0.79, 146, mood, false, true)}<path d="M0 ${f(H * 0.87)} H${W}" stroke="${NEON.white}" stroke-width="4" opacity=".3"/>`,
  }),
  // 3 — casco / ritratto partner
  (rng, mood) => ({
    back: `${neonSigns(rng, mood, 4)}${skyline(rng, 320, 540, "#070912", 0.7)}`,
    front: helmet(W * 0.5, H * 0.5, 186, mood),
  }),
  // 4 — strada di montagna
  (rng, mood) => ({
    back: mountainCurve(rng, mood),
    front: superbike(W * 0.5, H * 0.83, 140, mood, true, true),
  }),
  // 5 — meet point: due moto a confronto
  (rng, mood) => ({
    back: `${skyline(rng, 300, 560, "#070912", 0.9)}${windows(rng, mood.neon, 40, 320, 540)}`,
    front: `${superbike(W * 0.3, H * 0.8, 96, mood, false)}${superbike(W * 0.72, H * 0.84, 118, mood, true, true)}`,
  }),
  // 6 — scia in lunga esposizione
  (rng, mood) => ({
    back: `${streaks(rng, mood)}${skyline(rng, 330, 550, "#070912", 0.75)}`,
    front: superbike(W * 0.5, H * 0.78, 156, mood, rng() > 0.5, rng() > 0.4),
  }),
  // 7 — tricolore / raduno
  (rng, mood) => ({
    back: flagSweep(mood),
    front: helmet(W * 0.5, H * 0.52, 174, mood),
  }),
  // 8 — notte urbana con galleria luci
  (rng, mood) => ({
    back: `${neonSigns(rng, mood, 5)}${windows(rng, NEON.orange, 30, 300, 520)}`,
    front: superbike(W * 0.5, H * 0.79, 150, mood, rng() > 0.5, true),
  }),
  // 9 — passo al tramonto
  (rng, mood) => ({
    back: `${mountainCurve(rng, mood)}`,
    front: superbike(W * 0.47, H * 0.85, 130, mood, false, true),
  }),
  // 10 — pit lane
  (rng, mood) => ({
    back: `${skyline(rng, 320, 540, "#070912", 0.85)}${neonSigns(rng, mood, 3)}`,
    front: `${superbike(W * 0.5, H * 0.8, 142, mood, false, true)}<rect x="${f(W * 0.16)}" y="${f(H * 0.88)}" width="${f(W * 0.68)}" height="6" rx="3" fill="${NEON.white}" opacity=".32"/>`,
  }),
  // 11 — drift di luce
  (rng, mood) => ({
    back: `${streaks(rng, mood)}${streaks(rng, mood)}`,
    front: helmet(W * 0.5, H * 0.48, 192, mood),
  }),
  // 12 — col al buio
  (rng, mood) => ({
    back: mountainCurve(rng, mood),
    front: superbike(W * 0.5, H * 0.86, 126, mood, true, true),
  }),
];

/**
 * Cornice comune: vignettatura, grana, barra neon e micro-dati.
 * `plain` toglie ogni scritta: serve alle copertine che finiscono dentro card
 * con il titolo sovrapposto, dove il testo stampato nell'immagine verrebbe a
 * doppio.
 */
function frame(rng, mood, i, title, plain) {
  const dots = [];
  for (let k = 0; k < 40; k += 1) {
    dots.push(`<circle cx="${f(rnd(rng, 0, W))}" cy="${f(rnd(rng, 0, H))}" r="${f(rnd(rng, 0.6, 1.6))}" fill="#EAF6FF" opacity="${f(rnd(rng, 0.05, 0.2))}"/>`);
  }
  const [t1, t2] = [title.replace(/\s+\d+$/, ""), `# ${String(i + 1).padStart(2, "0")}`];
  const typography = plain
    ? ""
    : `
    <text x="46" y="${f(H - 118)}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="17" letter-spacing="5" fill="${mood.neon}">${t2}</text>
    <text x="46" y="${f(H - 76)}" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="40" font-weight="900" letter-spacing="1" fill="#FFFFFF">${t1.toUpperCase()}</text>
    <text x="47" y="${f(H - 48)}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" letter-spacing="4" fill="${NEON.white}" opacity=".55">SPONKY SQUAD · EVENTO</text>
    <rect x="${W - 150}" y="${f(H - 96)}" width="104" height="5" rx="2.5" fill="${mood.neon}"/>`;
  return `
    <rect x="26" y="26" width="${W - 52}" height="${H - 52}" fill="none" stroke="${mood.neon}" stroke-width="2" opacity=".5" rx="6"/>
    <rect x="36" y="36" width="${W - 72}" height="${H - 72}" fill="none" stroke="${NEON.white}" stroke-width="1" opacity=".18" rx="4"/>
    ${typography}
    <rect x="${W - 44}" y="46" width="6" height="64" rx="3" fill="${NEON.red}" opacity=".85"/>
    <rect x="${W - 58}" y="46" width="6" height="34" rx="3" fill="${mood.neon}" opacity=".85"/>
    ${dots.join("")}
    <rect width="${W}" height="${H}" fill="url(#artVignette)"/>`;
}

/**
 * Costituisce una copertina completa. `sceneIndex`/`moodIndex` permettono di
 * scegliere soggetto e palette invece di lasciarli legati alla posizione, cosi'
 * il set di servizio (community, anteprime) puo' riprendere una scena gia'
 * gradita senza duplicare la logica.
 */
function buildCover(rng, i, title, opts = {}) {
  const mood = MOODS[opts.moodIndex ?? i % MOODS.length];
  const scene = SCENES[opts.sceneIndex ?? i % SCENES.length];
  const { back, front } = scene(rng, mood);
  const vx = rnd(rng, W * 0.32, W * 0.68);
  const vy = rnd(rng, H * 0.42, H * 0.55);
  const horizon = rnd(rng, 470, 540);

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="artSky" x1="360" y1="0" x2="360" y2="${f(horizon)}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#04050A"/><stop offset=".5" stop-color="#0A0E1E"/><stop offset=".84" stop-color="#141B34"/><stop offset="1" stop-color="${mood.haze}"/>
    </linearGradient>
    <linearGradient id="artRoad" x1="360" y1="${f(vy)}" x2="360" y2="${H}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0B0D14"/><stop offset=".55" stop-color="#12141D"/><stop offset="1" stop-color="#1B1E2A"/>
    </linearGradient>
    <linearGradient id="artStreak" x1="0" y1="0" x2="1" y2="0">
      <stop stop-color="${mood.streak}" stop-opacity="0"/><stop offset=".5" stop-color="${mood.streak}"/><stop offset="1" stop-color="${mood.streak}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="artVisor" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#0B1420"/><stop offset=".45" stop-color="${mood.neon}" stop-opacity=".55"/><stop offset="1" stop-color="#04060B"/>
    </linearGradient>
    <linearGradient id="artBody" x1="0" y1="0" x2="0" y2="1">
      <stop stop-color="#161B2A"/><stop offset=".55" stop-color="#0C0F1A"/><stop offset="1" stop-color="#07080F"/>
    </linearGradient>
    <radialGradient id="artVignette" cx=".5" cy=".46" r=".78">
      <stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".72"/>
    </radialGradient>
    <radialGradient id="artGlow" cx=".5" cy=".5" r=".5">
      <stop stop-color="${mood.neon}" stop-opacity=".55"/><stop offset="1" stop-color="${mood.neon}" stop-opacity="0"/>
    </radialGradient>
    <filter id="artBlur3" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3"/></filter>
    <filter id="artBlur8" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="8"/></filter>
    <filter id="artBlur20" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="20"/></filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#artSky)"/>
  <ellipse cx="${f(vx)}" cy="${f(vy - 30)}" rx="360" ry="240" fill="url(#artGlow)" opacity=".7"/>
  ${back}
  <rect x="0" y="${f(horizon - 6)}" width="${W}" height="3" fill="${mood.neon}" opacity=".45" filter="url(#artBlur8)"/>
  ${road(vx, vy, mood)}
  ${streaks(rng, mood)}
  ${front}
  ${streaks(rng, mood)}
  <rect width="${W}" height="${H}" fill="url(#artVignette)" opacity=".55"/>
  ${frame(rng, mood, i, title, opts.plain)}
</svg>
`;
}

// --------------------------------------------------------------- esecuzione

fs.mkdirSync(OUT_DIR, { recursive: true });

const names = [
  "Notte Urbana", "Curva Pista", "Visore", "Passo Dolomiti", "Ritrovo Squad",
  "Lunga Esposizione", "Tricolore", "Galleria Luci", "Alba in Collina", "Pit Lane",
  "Derapata", "Col al Bui",
];

/**
 * Etichette leggibili delle scene, nello stesso ordine di SCENES: finiscono nel
 * manifest e servono al selettore per raggruppare le 52 copertine.
 */
const SCENE_LABELS = [
  "Notte urbana", "Curva in pista", "Casco", "Strada di montagna",
  "Ritrovo", "Lunga esposizione", "Tricolore", "Galleria luci",
  "Passo al tramonto", "Pit lane", "Derapata", "Col al buio",
];

/** Manifest come modulo TypeScript: il bundle resta tipizzato, niente fetch. */
function writeManifest(file, items) {
  const body = items
    .map(
      (it) =>
        `  { id: ${JSON.stringify(it.id)}, title: ${JSON.stringify(it.title)}, src: ${JSON.stringify(it.src)}, scene: ${it.scene}, sceneLabel: ${JSON.stringify(it.sceneLabel)}, mood: ${JSON.stringify(it.mood)} },`,
    )
    .join("\n");
  fs.writeFileSync(
    file,
    `/* GENERATO da scripts/gen-event-art.mjs - non modificare a mano. */
import type { EventArt } from "./eventArt";

export const EVENT_ART: EventArt[] = [
${body}
];
`,
  );
}

const manifest = [];
for (let i = 0; i < 52; i += 1) {
  const rng = makeRng(0x51eed + i * 7919);
  const base = names[i % names.length];
  const title = `${base} ${String(Math.floor(i / names.length) + 1).padStart(2, "0")}`;
  const slug = `art-${String(i + 1).padStart(2, "0")}`;
  // Stessa regola del default di buildCover, resa esplicita: il manifest deve
  // descrivere esattamente la scena e la palette che finiscono nel file.
  const moodIndex = i % MOODS.length;
  const sceneIndex = i % SCENES.length;
  const svg = buildCover(rng, i, title, { moodIndex, sceneIndex });
  fs.writeFileSync(path.join(OUT_DIR, `${slug}.svg`), svg);
  manifest.push({
    id: slug,
    title,
    src: `/assets/event-art/${slug}.svg`,
    scene: sceneIndex + 1,
    sceneLabel: SCENE_LABELS[sceneIndex],
    mood: MOODS[moodIndex].key,
  });
}

writeManifest(MANIFEST_OUT, manifest);

console.log(`${manifest.length} copertine generate in ${OUT_DIR} + manifest in ${MANIFEST_OUT}`);

// ------------------------------------------------ copertine gallery community
// Le card della gallery sovrappongono gia' etichetta e titolo sopra l'immagine:
// queste quattro escono "plain", senza scritte incise, stessa griglia e stessa
// cornice del resto del set.
const COMMUNITY_DIR = "public/assets/community-art";
fs.mkdirSync(COMMUNITY_DIR, { recursive: true });

const communityShots = [
  { slug: "ride-urbano", sceneIndex: 7, moodIndex: 1 },
  { slug: "cremona-circuit", sceneIndex: 1, moodIndex: 0 },
  { slug: "partner-ufficiali", sceneIndex: 4, moodIndex: 2 },
  { slug: "dolomiti", sceneIndex: 11, moodIndex: 3 },
];

communityShots.forEach((shot, index) => {
  const rng = makeRng(0x9a11c + index * 104729);
  const svg = buildCover(rng, index * 12, shot.slug, { ...shot, plain: true });
  fs.writeFileSync(path.join(COMMUNITY_DIR, `${shot.slug}.svg`), svg);
});

console.log(`${communityShots.length} copertine gallery in ${COMMUNITY_DIR}`);


