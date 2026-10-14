import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";

/**
 * Cursore personalizzato: una moto laterale che insegue il mouse.
 * - sopra un elemento interattivo la moto si ingrandisce;
 * - premendo il tasto la moto viene sostituita dal saluto dei motociclisti
 *   (le due dita rosa del maialino che si aprono a "V");
 * - in base alla velocita' la moto "pende" in curva e mostra scie luminose.
 */

const INTERACTIVE_SELECTOR =
  "a, button, [data-cursor='accent'], input, textarea, select, [role='button'], [role='tab']";

function BikeGlyph() {
  return (
    <svg viewBox="0 0 80 48" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="cursor-bike-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff9a3d" />
          <stop offset="55%" stopColor="#f05a12" />
          <stop offset="100%" stopColor="#b32c07" />
        </linearGradient>
        <linearGradient id="cursor-bike-fairing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#aeb4bf" />
        </linearGradient>
        <linearGradient id="cursor-bike-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#8f97a5" />
        </linearGradient>
        <filter id="cursor-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#cursor-glow)">
        {/* scie di velocita' */}
        <path className="cursor-trail" d="M2 20h12" stroke="#25e6ff" strokeWidth="3" strokeLinecap="round" opacity=".75" />
        <path className="cursor-trail" d="M0 27h9" stroke="#ff7a18" strokeWidth="3" strokeLinecap="round" opacity=".7" />
        <path className="cursor-trail" d="M4 34h10" stroke="#25e6ff" strokeWidth="3" strokeLinecap="round" opacity=".55" />

        {/* ruote: cerchio spesso + cerchione chiaro + mozzo arancio */}
        <circle cx="21" cy="32" r="12.5" fill="#08080c" stroke="url(#cursor-bike-rim)" strokeWidth="3.4" />
        <circle cx="21" cy="32" r="6" fill="none" stroke="#6f7684" strokeWidth="1.6" />
        <circle cx="21" cy="32" r="3.4" fill="#e74e0f" stroke="#ffd9c4" strokeWidth="1.2" />
        <circle cx="62" cy="32" r="12.5" fill="#08080c" stroke="url(#cursor-bike-rim)" strokeWidth="3.4" />
        <circle cx="62" cy="32" r="6" fill="none" stroke="#6f7684" strokeWidth="1.6" />
        <circle cx="62" cy="32" r="3.4" fill="#e74e0f" stroke="#ffd9c4" strokeWidth="1.2" />

        {/* forcella anteriore */}
        <path d="M62 32 L56 16" stroke="#e8ecf3" strokeWidth="4.4" strokeLinecap="round" />
        <path d="M60.5 27 L55 14" stroke="#9aa2b0" strokeWidth="2" strokeLinecap="round" />

        {/* motore */}
        <path d="M33 25 L48 25 L46 37 L35 37 Z" fill="#141720" stroke="#d7dce4" strokeWidth="1.8" strokeLinejoin="round" />

        {/* marmitta */}
        <path d="M30 38 L47 36" stroke="#e74e0f" strokeWidth="5" strokeLinecap="round" />
        <path d="M30 38 L47 36" stroke="#ffb98a" strokeWidth="1.6" strokeLinecap="round" opacity=".8" />

        {/* corpo: codino, serbatoio, carena */}
        <path
          d="M11 19 L27 15 L35 19 L45 11 L57 11 L67 19 L69 29 L59 31 L49 26 L39 31 L26 31 Z"
          fill="url(#cursor-bike-body)"
          stroke="#7e1f04"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {/* luce sul serbatoio */}
        <path d="M45 12 L56 12 L62 17 L49 16 Z" fill="#ffffff" opacity=".45" />
        {/* sella */}
        <path d="M11 19 L27 15 L31 21 L17 24 Z" fill="#0d0f14" />
        {/* carena anteriore + faro */}
        <path d="M56 11 L68 19 L66 28 L55 24 Z" fill="url(#cursor-bike-fairing)" stroke="#7e838d" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M67 19 L75 22 L69 28 Z" fill="#25e6ff" stroke="#bff6ff" strokeWidth="1.2" strokeLinejoin="round" />
        {/* windscreen */}
        <path d="M49 6 L59 8 L57 12 L47 11 Z" fill="#25e6ff" opacity=".85" stroke="#bff6ff" strokeWidth="1" strokeLinejoin="round" />
        {/* manubrio */}
        <path d="M56 13 L64 10" stroke="#e8ecf3" strokeWidth="2.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/**
 * Saluto dei motociclisti: la zampina rosa del maialino con due dita distese
 * (indice + medio) che ondeggiano, polso col giubbotto in pelle.
 */
function SaluteGlyph() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="cursor-salute-skin" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#ffc6cd" />
          <stop offset="100%" stopColor="#e8949f" />
        </linearGradient>
        <linearGradient id="cursor-salute-cuff" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#26282f" />
          <stop offset="100%" stopColor="#0b0c10" />
        </linearGradient>
        <filter id="cursor-salute-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#cursor-salute-glow)">
        {/* archi di moto: il "ciao" delle due dita */}
        <path className="cursor-trail" d="M9 18 C4 22 2 29 4 36" stroke="#25e6ff" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity=".7" />
        <path className="cursor-trail" d="M55 16 C60 20 62 27 60 34" stroke="#ff7a18" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity=".65" />

        {/* giubbotto in pelle (manica) */}
        <path d="M18 49 L45 46 L48 64 L15 64 Z" fill="url(#cursor-salute-cuff)" />
        <path d="M18.6 55 L46.6 52.2" stroke="#d8232a" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M18.2 50.6 L45.4 47.8" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity=".25" />

        {/* due dita distese (indice + medio) che salutano, dietro il palmo */}
        <g className="cursor-salute-fingers">
          <rect x="18.5" y="6" width="9.5" height="28" rx="4.75" fill="url(#cursor-salute-skin)" transform="rotate(-13 23.25 20)" />
          <rect x="30" y="4" width="9.5" height="30" rx="4.75" fill="url(#cursor-salute-skin)" transform="rotate(11 34.75 19)" />
          {/* luce sulle punte */}
          <ellipse cx="19.6" cy="9.6" rx="2.2" ry="3" fill="#ffffff" opacity=".5" transform="rotate(-13 19.6 9.6)" />
          <ellipse cx="38.6" cy="8" rx="2.2" ry="3" fill="#ffffff" opacity=".5" transform="rotate(11 38.6 8)" />
          {/* pieghe delle nocche */}
          <path d="M19.6 24.5 H26.2M31.2 23 H37.8" stroke="#d97986" strokeWidth="1.3" strokeLinecap="round" opacity=".6" />
        </g>

        {/* dorso della mano */}
        <path d="M23 27 H41 C44.5 27 47 29.6 47 33 V40 C47 45.5 42.5 49 35 49 H30 C24 49 20 45.5 20 40 V30.5 C20 28.4 21.2 27 23 27 Z" fill="url(#cursor-salute-skin)" />

        {/* dita piegate (anulare + mignolo) sporgenti sul lato destro */}
        <path d="M40 27.5 H45 C48.6 27.5 51 30.2 51 33.6 C51 37 48.6 39.6 45 39.6 H40 Z" fill="url(#cursor-salute-skin)" />
        <path d="M41.5 39 H46 C49 39 51 41.4 51 44.4 C51 47.3 49 49.4 46 49.4 H41.5 Z" fill="url(#cursor-salute-skin)" />
        <path d="M40.6 33.4 H50.4M41.4 44.2 H50.6" stroke="#d97986" strokeWidth="1.4" strokeLinecap="round" opacity=".75" />
        {/* ombra tra le dita piegate e il dorso */}
        <path d="M40.6 28 V49" stroke="#d97986" strokeWidth="1.6" strokeLinecap="round" opacity=".5" />

        {/* pollice ripiegato sul davanti */}
        <path d="M20 33 C14.5 33 11 35.8 11 39.4 C11 43 14.5 45.6 20 45.6 Z" fill="url(#cursor-salute-skin)" />
        <path d="M13.5 36.2 C15.6 35.2 18 34.9 20.4 35.4" stroke="#d97986" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity=".6" />

        {/* ombra morbida sotto il palmo */}
        <path d="M24 47.5 C29 49.6 37 49.4 42 47" stroke="#d97986" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".4" />
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
  const rotate = useTransform(lean, [-2600, 2600], [-16, 16]);

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
      saluteTimer.current = window.setTimeout(() => setPressed(false), 560);
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

  const scale = pressed ? 1.18 : hovering ? 1.5 : 1;

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
            opacity: pressed ? 0.35 : hovering ? 0.9 : 0.55,
          }}
        />

        <motion.span
          className="absolute h-16 w-16"
          animate={{ opacity: pressed ? 0 : 1, scale: pressed ? 0.4 : 1 }}
          transition={{ duration: 0.16 }}
        >
          <BikeGlyph />
        </motion.span>

        <motion.span
          className="absolute h-16 w-16"
          animate={{ opacity: pressed ? 1 : 0, scale: pressed ? 1.05 : 0.4, rotate: pressed ? 0 : -20 }}
          transition={{ type: "spring", stiffness: 420, damping: 20 }}
        >
          <SaluteGlyph />
        </motion.span>
      </div>
    </motion.div>
  );
}
