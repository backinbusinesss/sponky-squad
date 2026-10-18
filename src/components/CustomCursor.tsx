import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";

/**
 * Cursore personalizzato: una Ducati Panigale laterale che insegue il mouse.
 * - sopra un elemento interattivo la moto "impenna" (ruota alzata + fiamma
 *   allo scarico) e si ingrandisce;
 * - premendo il tasto la moto viene sostituita dal saluto dei motociclisti
 *   (le due dita rosa del maialino che ondeggiano a "V");
 * - in base alla velocita' la moto "pende" in curva e mostra scie luminose.
 */

const INTERACTIVE_SELECTOR =
  "a, button, [data-cursor='accent'], input, textarea, select, [role='button'], [role='tab']";

/**
 * Ducati Panigale V4 in profilo laterale: coda appuntita, sella incassata,
 * serbatoio bombato, carena rossa corsa con presa d'aria, forcella oro,
 * scarico con uscita posteriore, cerchi a tre razze con disco e pinza.
 * Con `active` aggiunge la fiamma dello scarico quando la moto impenna.
 */
function BikeGlyph({ active = false }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 96 54" className="h-full w-full" aria-hidden="true">
      <defs>
        {/* rosso Ducati con ombreggiatura laterale */}
        <linearGradient id="duc-red" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor="#ff5656" />
          <stop offset="38%" stopColor="#de1c26" />
          <stop offset="100%" stopColor="#75090f" />
        </linearGradient>
        <linearGradient id="duc-red-2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ee2732" />
          <stop offset="100%" stopColor="#880c12" />
        </linearGradient>
        {/* oro forcella Öhlins */}
        <linearGradient id="duc-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe7a1" />
          <stop offset="50%" stopColor="#e0a51e" />
          <stop offset="100%" stopColor="#8f6205" />
        </linearGradient>
        {/* cerchione */}
        <linearGradient id="duc-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#565c69" />
          <stop offset="50%" stopColor="#1d2028" />
          <stop offset="100%" stopColor="#414654" />
        </linearGradient>
        <linearGradient id="duc-flame" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff3c4" />
          <stop offset="45%" stopColor="#ff9c1a" />
          <stop offset="100%" stopColor="#ff4d00" stopOpacity="0" />
        </linearGradient>
        <filter id="duc-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.9" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#duc-glow)">
        {/* scie di velocita' */}
        <path className="cursor-trail" d="M1 19h13" stroke="#ff5a3c" strokeWidth="3" strokeLinecap="round" opacity=".8" />
        <path className="cursor-trail" d="M-1 26h9" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" opacity=".5" />
        <path className="cursor-trail" d="M3 33h11" stroke="#ff5a3c" strokeWidth="3" strokeLinecap="round" opacity=".6" />

        {/* scarico: dal motore all'uscita posteriore bassa */}
        <path d="M63 42.4 C56 44 49 43.4 44 41.6" stroke="#2a2e37" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M45.5 41.8 L37.6 40.6" stroke="#ff6a3c" strokeWidth="4.6" strokeLinecap="round" />
        <path d="M44.6 41.6 L39 40.9" stroke="#ffe0b6" strokeWidth="1.6" strokeLinecap="round" />

        {/* forcella oro (USD, inclinata) */}
        <path d="M74 37 L80 15" stroke="url(#duc-gold)" strokeWidth="5.2" strokeLinecap="round" />
        <path d="M72.4 40 L78 18" stroke="#6b4c05" strokeWidth="2.4" strokeLinecap="round" opacity=".55" />
        {/* pinza freno anteriore */}
        <path d="M69.4 30.5 L73.6 29 L75 32.4 L71 34 Z" fill="#e0a51e" stroke="#7d5605" strokeWidth=".9" strokeLinejoin="round" />

        {/* forcellone a lato singolo (retro) */}
        <path d="M38 34 L25 36" stroke="#2b2f38" strokeWidth="6.4" strokeLinecap="round" />
        <path d="M38 34 L25 36" stroke="#5b616e" strokeWidth="1.8" strokeLinecap="round" opacity=".65" />

        {/* catena */}
        <path d="M25 33.4 L45.5 36.6" stroke="#9aa1af" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2.4 1.6" opacity=".85" />
        <path d="M25 38.6 L45 38" stroke="#6d7482" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="2.4 1.6" opacity=".7" />

        {/* ===== CERCHI A TRE RAZZE ===== */}
        {[
          { cx: 24, cy: 36 },
          { cx: 74, cy: 36 },
        ].map((w) => (
          <g key={`wheel-${w.cx}`}>
            <circle cx={w.cx} cy={w.cy} r="13" fill="#08080c" />
            {/* battistrada */}
            <circle cx={w.cx} cy={w.cy} r="12.2" fill="none" stroke="#1b1d24" strokeWidth="1.6" strokeDasharray="3.4 3.4" opacity=".85" />
            {/* nastro rosso sul battistrada */}
            <circle cx={w.cx} cy={w.cy} r="11.1" fill="none" stroke="#d8161f" strokeWidth=".9" opacity=".5" />
            <circle cx={w.cx} cy={w.cy} r="8.4" fill="url(#duc-rim)" stroke="#767d8c" strokeWidth="1.2" />
            {/* razze a Y */}
            <path
              d={`M${w.cx} ${w.cy} L${w.cx} ${w.cy - 8.2}M${w.cx} ${w.cy} L${w.cx + 7.1} ${w.cy + 4.1}M${w.cx} ${w.cy} L${w.cx - 7.1} ${w.cy + 4.1}`}
              stroke="#0b0c11"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            <path
              d={`M${w.cx} ${w.cy} L${w.cx} ${w.cy - 8.2}M${w.cx} ${w.cy} L${w.cx + 7.1} ${w.cy + 4.1}M${w.cx} ${w.cy} L${w.cx - 7.1} ${w.cy + 4.1}`}
              stroke="#4b515e"
              strokeWidth="1"
              strokeLinecap="round"
              opacity=".7"
            />
            {/* mozzo rosso */}
            <circle cx={w.cx} cy={w.cy} r="3.2" fill="#d8161f" stroke="#ffb0a8" strokeWidth="1.1" />
            {/* disco freno */}
            <circle cx={w.cx} cy={w.cy} r="6.2" fill="none" stroke="#c9ced8" strokeWidth="1.3" opacity=".65" />
            <circle cx={w.cx} cy={w.cy} r="5" fill="none" stroke="#8b919d" strokeWidth=".7" strokeDasharray="1.6 2.6" opacity=".8" />
            <circle cx={w.cx} cy={w.cy} r="9.8" fill="none" stroke="#25e6ff" strokeWidth="1" opacity=".3" />
          </g>
        ))}

        {/* fiamma dello scarico: esce quando la moto impenna */}
        {active && (
          <g className="cursor-exhaust">
            <path d="M38.4 40.4 L24 37.6 L29.6 40.4 L21 43.4 L37.6 42.6 Z" fill="url(#duc-flame)" />
            <path d="M37.6 41 L27.5 39.6 L31.4 41.4 L26 43.2 L37.4 42.5 Z" fill="#fff6d0" opacity=".9" />
            <path className="cursor-trail" d="M18 45h7" stroke="#ffb44d" strokeWidth="2.2" strokeLinecap="round" opacity=".8" />
            <path className="cursor-trail" d="M22 34h6" stroke="#ffb44d" strokeWidth="2" strokeLinecap="round" opacity=".6" />
          </g>
        )}

        {/* pancia della carena (panigale) */}
        <path d="M46 32 L70 30 L74 38 L58 42 L48 40 Z" fill="url(#duc-red-2)" stroke="#5a070c" strokeWidth="1.2" strokeLinejoin="round" />
        {/* presa d'aria laterale + lamelle */}
        <path d="M52 33 L64 32 L62 37.4 L53 38.4 Z" fill="#0f1017" />
        <path d="M54 34.6 L61.6 33.9M54.4 36.6 L62 35.9" stroke="#4a5060" strokeWidth="1" strokeLinecap="round" opacity=".85" />
        {/* viti della carena */}
        {[{ x: 49.6, y: 34.4 }, { x: 67, y: 33.4 }, { x: 55.4, y: 40.4 }].map((s) => (
          <circle key={`bolt-${s.x}`} cx={s.x} cy={s.y} r="1" fill="#b9bfcb" opacity=".8" />
        ))}

        {/* ===== CORPO: coda appuntita, sella incassata, serbatoio, carena ===== */}
        <path
          d="M8.6 11.2 L26.4 18.4 C30.4 19.9 35.4 20.1 39.6 19 L47.4 16.9 C53 14.9 58.4 11.7 66.4 11.5 L86.6 19.8 L90 25.8 L79.2 31.6 L65.6 27.4 L51 31.6 L34.8 31.6 L17.6 26.2 Z"
          fill="url(#duc-red)"
          stroke="#5a070c"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {/* luce sul serbatoio */}
        <path d="M47.4 17.2 C53 15.2 58.4 12.4 66.4 12.2 L78.4 18.4 L55 20.6 Z" fill="#ffffff" opacity=".3" />
        {/* banda scura racing */}
        <path d="M30 26 L70 24 L74 29 L38 31 Z" fill="#14151c" opacity=".5" />
        {/* sagome pannelli */}
        <path d="M47.4 17.2 L52.8 31.2" stroke="#5a070c" strokeWidth="1" opacity=".75" />
        <path d="M67 12.6 L74.6 31" stroke="#5a070c" strokeWidth="1" opacity=".75" />
        <path d="M33 20.6 L36.4 31.2" stroke="#5a070c" strokeWidth="1" opacity=".6" />
        {/* radiatore */}
        <path d="M60 29.6 L69.6 28.6 L70.4 31.6 L60.6 32.6 Z" fill="#0e0f15" stroke="#3a3e48" strokeWidth=".7" />
        <path d="M61.4 30.6 L69.4 29.8M61.6 32 L69.6 31.2" stroke="#565c6a" strokeWidth=".7" opacity=".9" />
        {/* logo S sul serbatoio */}
        <path d="M56.5 21.8 L63.5 20.6 L64 23.8 L57.4 25 Z" fill="#ffffff" opacity=".85" />
        <path d="M58 24.2 L62.4 23.4" stroke="#d8161f" strokeWidth="1.4" strokeLinecap="round" />

        {/* coda (tail) nera + fanale */}
        <path d="M8.6 11.2 L26.6 18.6 L24.8 22.6 L9.4 15.6 Z" fill="#0b0c11" />
        <path d="M9.4 13.6 L21.6 17.6" stroke="#ff2f2f" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M10 15 L20.6 18.6" stroke="#ffd6d6" strokeWidth=".9" strokeLinecap="round" opacity=".8" />
        {/* sella incassata nella rientranza */}
        <path d="M26.4 18.4 C30.6 20.2 35.6 20.4 40.4 19.2 L42.4 22.4 C36.6 23.8 30.2 23.2 25.6 21.2 Z" fill="#0b0c11" />
        <path d="M27.4 19.8 C31.4 21.4 36.2 21.6 40.6 20.6" stroke="#2f313b" strokeWidth="1.2" strokeLinecap="round" fill="none" />

        {/* windscreen */}
        <path d="M66 5.6 L76 10.8 L72 14 L62.6 9.8 Z" fill="#25e6ff" opacity=".68" stroke="#d9fbff" strokeWidth="1" strokeLinejoin="round" />

        {/* carena frontale + faro */}
        <path d="M72 11.6 L88.4 19.8 L90 25.8 L79.6 31.4 L71.6 20 Z" fill="url(#duc-red)" stroke="#5a070c" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M85 20 L91.6 23.2 L86.6 27.4 Z" fill="#25e6ff" stroke="#e6fcff" strokeWidth="1.1" strokeLinejoin="round" />
        {/* doppio faro LED */}
        <path d="M84.2 21.4 L89.8 23.6" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M85.2 24.8 L88.8 25.8" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity=".85" />
        {/* winglet */}
        <path d="M76 26 L86.5 25 L85.5 28.2 L77 29.2 Z" fill="#13141b" stroke="#404454" strokeWidth=".8" strokeLinejoin="round" />
        {/* manubrio */}
        <path d="M70 12 L80 8.8" stroke="#e8ecf3" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M78.6 9.2 L83.4 7.6" stroke="#0b0c11" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/**
 * Saluto dei motociclisti: la zampina rosa del maialino. Due dita distese
 * (indice + medio) piene e lunghe in "V", con unghie e due pieghe di nocche
 * ciascuna; anulare e mignolo ripiegati a due rulli distinti sul destro;
 * pollice che attraversa il palmo con la sua unghia; polso stretto dalla
 * manica del giubbotto in pelle con fascia rossa e bottoni metallici.
 */
function SaluteGlyph() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="sal-skin" x1="0.15" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#ffdbe2" />
          <stop offset="45%" stopColor="#ffb0bc" />
          <stop offset="100%" stopColor="#e88595" />
        </linearGradient>
        <linearGradient id="sal-skin-2" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#ffc2cc" />
          <stop offset="100%" stopColor="#dc7c8d" />
        </linearGradient>
        <linearGradient id="sal-cuff" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor="#2e313b" />
          <stop offset="100%" stopColor="#0a0b0f" />
        </linearGradient>
        <filter id="sal-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.7" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#sal-glow)">
        {/* archi di moto: il "ciao" delle due dita */}
        <path className="cursor-trail" d="M5 21 C0 26 -1 34 2 41" stroke="#25e6ff" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity=".7" />
        <path className="cursor-trail" d="M59 19 C64 24 65 32 62 39" stroke="#ff7a18" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity=".65" />

        {/* ===== DUE DITA DISTESE (indice + medio) ===== */}
        <g className="cursor-salute-fingers">
          {/* indice: piu' lungo e piu' sottile, inclinato a sinistra */}
          <path
            d="M28 35.6 C28 25.6 24.4 14.6 19.4 9.4 C17.2 7.2 12.4 8 11.4 12.8 C10.9 21.6 14.4 30.6 21 35.6 Z"
            fill="url(#sal-skin)"
            stroke="#bb5264"
            strokeWidth="1.05"
            strokeLinejoin="round"
          />
          {/* medio: simmetrico, inclinato a destra */}
          <path
            d="M32 35.6 C32 25.6 35.6 14.6 40.6 9.4 C42.8 7.2 47.8 8 48.8 12.8 C49.3 21.6 46 30.6 39 35.6 Z"
            fill="url(#sal-skin)"
            stroke="#bb5264"
            strokeWidth="1.05"
            strokeLinejoin="round"
          />
          {/* ombra profonda nella fessura tra le due dita */}
          <path d="M28.6 34 C29.4 25 31.4 16.4 34.4 10.4" stroke="#c8606f" strokeWidth="2" fill="none" opacity=".7" strokeLinecap="round" />
          {/* luce sul bordo esterno di ciascuna dita */}
          <path d="M12.4 13.6 C13.2 10.6 15.4 8.6 18.4 8.6" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity=".6" strokeLinecap="round" />
          <path d="M41.8 8.6 C45 8.6 47.4 10.6 48.2 13.6" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity=".55" strokeLinecap="round" />
          {/* unghie */}
          <ellipse cx="15.2" cy="11.8" rx="2.3" ry="3" fill="#fff4f7" opacity=".96" transform="rotate(-19 15.2 11.8)" />
          <ellipse cx="45" cy="11.8" rx="2.3" ry="3" fill="#fff4f7" opacity=".96" transform="rotate(19 45 11.8)" />
          <ellipse cx="14.5" cy="10.8" rx=".95" ry="1.35" fill="#ffffff" transform="rotate(-19 14.5 10.8)" />
          <ellipse cx="44.3" cy="10.8" rx=".95" ry="1.35" fill="#ffffff" transform="rotate(19 44.3 10.8)" />
          {/* due pieghe per ogni dita: nocca e falange */}
          <path d="M13.8 20.4 C16.4 19.3 19.6 19.5 22.4 20.6" stroke="#c8606f" strokeWidth="1.25" fill="none" opacity=".7" strokeLinecap="round" />
          <path d="M15.4 27.8 C18 26.7 21 26.9 23.6 28" stroke="#c8606f" strokeWidth="1.25" fill="none" opacity=".6" strokeLinecap="round" />
          <path d="M37.8 20.6 C40.6 19.5 43.8 19.3 46.4 20.4" stroke="#c8606f" strokeWidth="1.25" fill="none" opacity=".7" strokeLinecap="round" />
          <path d="M36.6 28 C39.2 26.9 42.2 26.7 44.8 27.8" stroke="#c8606f" strokeWidth="1.25" fill="none" opacity=".6" strokeLinecap="round" />
        </g>

        {/* ===== PALMO: largo sulle nocche, stretto al polso ===== */}
        <path
          d="M17.6 33.6 C22 32.4 27 32.4 28.6 34.4 L30 37.8 L31.4 34.4 C34 32.4 37.4 31.6 41 32.6 C45.8 33.9 48.6 37.6 48.6 42 C48.6 47.4 46.6 51.8 43.2 53.2 C37.2 55.6 27 55.2 22 52.8 C18 50.8 16.4 46.2 16.6 41.2 C16.8 37.4 17 34.8 17.6 33.6 Z"
          fill="url(#sal-skin)"
          stroke="#bb5264"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* ombra morbida sotto le nocche */}
        <path d="M21.4 36.6 C27.4 35.6 35.6 35.3 42 36.8" stroke="#c8606f" strokeWidth="1.3" fill="none" opacity=".26" strokeLinecap="round" />

        {/* ===== DITA PIEGATE: anulare e mignolo, due rulli ben staccati ===== */}
        <path
          d="M41.6 32.2 H47.6 C51.8 32.2 54.8 35.2 54.8 39 C54.8 42.8 51.8 45.6 47.6 45.6 H41.6 C39.2 45.6 37.8 43.9 37.8 41.6 V36.2 C37.8 33.9 39.2 32.2 41.6 32.2 Z"
          fill="url(#sal-skin-2)"
          stroke="#bb5264"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <path
          d="M42.4 45.2 H47.6 C51.2 45.2 53.8 47.7 53.8 50.8 C53.8 53.9 51.2 56.2 47.6 56.2 H42.4 C40.2 56.2 39 54.7 39 52.8 V48.6 C39 46.7 40.2 45.2 42.4 45.2 Z"
          fill="url(#sal-skin-2)"
          stroke="#bb5264"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        {/* stacco netto tra i due rulli */}
        <path d="M38.4 45.4 C42 46.4 47.8 46.6 54 45.6" stroke="#a9475a" strokeWidth="2" fill="none" opacity=".85" strokeLinecap="round" />
        {/* piega dell'anulare */}
        <path d="M41.8 39 C45 38.2 49.6 38.2 53.6 39" stroke="#c8606f" strokeWidth="1.3" fill="none" opacity=".6" strokeLinecap="round" />
        {/* luce sulle gobbe delle nocche */}
        <path d="M42.4 34 C45.4 33.2 49.4 33.4 52 34.6" stroke="#ffffff" strokeWidth="1.3" fill="none" opacity=".45" strokeLinecap="round" />
        <path d="M43.2 47 C46 46.3 49.6 46.5 52 47.6" stroke="#ffffff" strokeWidth="1.2" fill="none" opacity=".38" strokeLinecap="round" />

        {/* ===== POLLICE: di spessore crescente, punta tonda a destra ===== */}
        <path
          d="M17.6 40.8 C14 41.6 12.2 45 13.4 48.4 C14.6 51.8 18.2 53.4 21.8 52.4 L39.8 47.6 C43.4 46.6 45.4 43.6 44.6 40.6 C43.8 37.6 40.8 36 37.4 36.8 L23 40.2 C20.6 40.7 18.9 40.8 17.6 40.8 Z"
          fill="url(#sal-skin-2)"
          stroke="#bb5264"
          strokeWidth="1.15"
          strokeLinejoin="round"
        />
        {/* unghia del pollice */}
        <ellipse cx="41.4" cy="42.4" rx="2.3" ry="1.7" fill="#fff4f7" opacity=".95" transform="rotate(-16 41.4 42.4)" />
        {/* articolazione */}
        <path d="M22.4 42.4 C26.4 43.6 32 42.6 36.8 39.4" stroke="#c8606f" strokeWidth="1.3" fill="none" opacity=".7" strokeLinecap="round" />
        {/* luce lungo la schiena del pollice */}
        <path d="M15.6 44.4 C14.6 46.2 14.8 48.6 16.2 50.4" stroke="#ffffff" strokeWidth="1.3" fill="none" opacity=".45" strokeLinecap="round" />
        {/* ombra sotto il pollice */}
        <path d="M22.6 52.4 C27.4 53.4 34.4 52.4 39.6 49.6" stroke="#a9475a" strokeWidth="1.4" fill="none" opacity=".55" strokeLinecap="round" />

        {/* ===== GIUBBOTTO IN PELLE: manica che sale sul polso ===== */}
        <path d="M18.4 49.6 L46.4 45.4 L53 64 L12 64 Z" fill="url(#sal-cuff)" />
        <path d="M19.2 55.2 L48.4 51.2" stroke="#d8232a" strokeWidth="3.6" strokeLinecap="round" />
        <path d="M19.2 50 L47.2 45.8" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity=".28" />
        {/* cucitura a punto */}
        <path d="M21.4 59 L51 55" stroke="#4a4e59" strokeWidth="1" strokeDasharray="3 3" strokeLinecap="round" />
        {/* bottoni metallici */}
        <circle cx="24.4" cy="60.8" r="1.7" fill="#d9a521" stroke="#7c5c0a" strokeWidth=".7" />
        <circle cx="45.8" cy="58" r="1.7" fill="#d9a521" stroke="#7c5c0a" strokeWidth=".7" />
      </g>
    </svg>
  );
}

export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(true);
  const saluteTimer = useRef<number | null>(null);

  const mouseX = useMotionValue(-120);
  const mouseY = useMotionValue(-120);
  const x = useSpring(mouseX, { stiffness: 520, damping: 40, mass: 0.24 });
  const y = useSpring(mouseY, { stiffness: 520, damping: 40, mass: 0.24 });

  // inclinazione della moto in base alla velocita' orizzontale del mouse
  const velocity = useVelocity(x);
  const lean = useSpring(velocity, { stiffness: 160, damping: 20, mass: 0.3 });
  const rotate = useTransform(lean, [-2600, 2600], [-13, 13]);

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    setEnabled(finePointer);

    if (!finePointer) {
      return;
    }

    const move = (event: PointerEvent) => {
      mouseX.set(event.clientX);
      mouseY.set(event.clientY);
      setVisible(true);
      const target = event.target;
      setHovering(
        target instanceof Element && Boolean(target.closest(INTERACTIVE_SELECTOR)),
      );
    };
    const down = () => {
      if (saluteTimer.current) {
        window.clearTimeout(saluteTimer.current);
        saluteTimer.current = null;
      }
      setPressed(true);
    };
    const up = () => {
      // il saluto resta visibile per un attacco dopo il click, poi torna la moto
      if (saluteTimer.current) {
        window.clearTimeout(saluteTimer.current);
      }
      saluteTimer.current = window.setTimeout(() => setPressed(false), 640);
    };
    const leave = () => setVisible(false);
    const enter = () => setVisible(true);

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointerleave", leave);
    window.addEventListener("pointerenter", enter);

    return () => {
      if (saluteTimer.current) {
        window.clearTimeout(saluteTimer.current);
      }
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointerenter", enter);
    };
  }, [mouseX, mouseY]);

  if (!enabled) {
    return null;
  }

  // La moto continua a impennare anche mentre si preme: il saluto arriva
  // sopra, le ruote restano sempre a vista.
  const wheelie = hovering;
  const scale = pressed ? 1.2 : hovering ? 1.5 : 1;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[90] -ml-12 -mt-12 h-24 w-24"
      style={{ x, y, rotate }}
      animate={{
        scale,
        opacity: visible ? 1 : 0,
        filter: hovering
          ? "drop-shadow(0 0 12px rgba(37,230,255,.75)) drop-shadow(0 0 26px rgba(231,78,15,.45))"
          : "drop-shadow(0 0 7px rgba(231,78,15,.5))",
      }}
      transition={{ type: "spring", stiffness: 340, damping: 22, mass: 0.5 }}
    >
      <div className="relative grid h-full w-full place-items-center">
        {/* alone luminoso dietro la moto */}
        <span
          className="absolute h-14 w-14 rounded-full blur-xl transition-opacity duration-300"
          style={{
            background:
              "radial-gradient(circle, rgba(231,78,15,.55), rgba(37,230,255,.22) 55%, transparent 72%)",
            opacity: pressed ? 0.35 : hovering ? 0.95 : 0.55,
          }}
        />

        {/*
          La moto "impenna" sopra un elemento interattivo: la rotazione ha
          come perno la ruota posteriore (25% / 73% della scatola) e la
          ruota anteriore si solleva con un piccolo rimbalzo di molla.
        */}
        <motion.span
          className="absolute h-16 w-16"
          style={{ transformOrigin: "25% 73%" }}
          animate={{
            opacity: pressed ? 0.62 : 1,
            scale: pressed ? 0.84 : 1,
            rotate: wheelie ? -19 : 0,
            y: wheelie ? -2 : 0,
          }}
          transition={{ type: "spring", stiffness: 330, damping: 12, mass: 0.7 }}
        >
          <BikeGlyph active={wheelie} />
        </motion.span>

        <motion.span
          className="absolute h-16 w-16"
          animate={{ opacity: pressed ? 1 : 0, scale: pressed ? 1.06 : 0.4, rotate: pressed ? 0 : -20 }}
          transition={{ type: "spring", stiffness: 420, damping: 20 }}
        >
          <SaluteGlyph />
        </motion.span>
      </div>
    </motion.div>
  );
}
