import { lazy, Suspense } from "react";
import { ArrowDown, BadgeCheck, MapPin, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { MagneticButton } from "@/components/MagneticButton";
import { asset } from "@/lib/asset";

const BikeScene = lazy(() => import("@/three/BikeScene").then((module) => ({ default: module.BikeScene })));

export function HeroSection() {
  return (
    <section id="top" className="relative min-h-[94svh] overflow-hidden bg-radial-neon pt-28">
      <div className="absolute inset-0">
        <Suspense fallback={<div className="h-full w-full bg-asphalt-950" />}>
          <BikeScene />
        </Suspense>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-asphalt-950/20 via-asphalt-950/15 to-asphalt-950" />
      {/* Strada in prospettiva: nastro centrale con la corsia tratteggiata e
          i marciapiedi che si allargano verso il basso. A tutta altezza e
          senza sfumature sembrava un pannello, non un pavé. */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/2 hidden h-44 w-[120vw] -translate-x-1/2 opacity-[.45] md:block"
        style={{
          transform: "translateX(-50%) perspective(220px) rotateX(58deg)",
          transformOrigin: "bottom center",
          maskImage: "linear-gradient(180deg, transparent 0%, #000 58%, #000 100%)",
          WebkitMaskImage: "linear-gradient(180deg, transparent 0%, #000 58%, #000 100%)",
          backgroundImage:
            "linear-gradient(90deg, transparent 0 12%, rgba(255,255,255,.30) 12% 12.5%, transparent 12.5% 87.5%, rgba(255,255,255,.30) 87.5% 88%, transparent 88% 100%), linear-gradient(90deg, transparent 0 49.4%, rgba(255,255,255,.42) 49.4% 50.6%, transparent 50.6% 100%)",
        }}
      />
      {/* corsia tratteggiata al centro, piu' stretta e sbiadita verso l'orizzonte */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/2 hidden h-44 w-[120vw] -translate-x-1/2 opacity-[.55] md:block"
        style={{
          transform: "translateX(-50%) perspective(220px) rotateX(58deg)",
          transformOrigin: "bottom center",
          maskImage: "linear-gradient(180deg, transparent 0%, #000 62%, #000 100%)",
          WebkitMaskImage: "linear-gradient(180deg, transparent 0%, #000 62%, #000 100%)",
          backgroundImage:
            "repeating-linear-gradient(180deg, rgba(231,78,18,.85) 0 26px, transparent 26px 58px)",
          backgroundSize: "3px 100%",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* Su schermi stretti la moto passa esattamente sotto il testo:
          questo scrim tiene il copy leggibile senza spegnere del tutto il 3D. */}
      <div className="absolute inset-0 bg-gradient-to-b from-asphalt-950/72 via-asphalt-950/52 to-asphalt-950/30 lg:hidden" />

      <div className="container relative z-10 grid min-h-[calc(94svh-7rem)] items-center gap-8 pb-16 pt-8 lg:grid-cols-[minmax(0,1fr)_25rem] xl:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="max-w-3xl">
          <motion.p
            className="mb-5 inline-flex rounded-full border border-racing-orange/30 bg-racing-orange/10 px-4 py-2 text-xs font-extrabold uppercase tracking-normal text-racing-orange"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
          >
            Community italiana per biker
          </motion.p>
          <motion.img
            src={asset("/assets/sponky-logo-original.webp")}
            alt="Sponky Squad"
            className="mb-4 h-16 w-16 rounded-full bg-white/8 object-contain p-2 shadow-neon md:h-20 md:w-20"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          />
          <motion.h1
            className="font-display text-[clamp(3.9rem,8.9vw,9.4rem)] uppercase leading-[0.8] text-white neon-text"
            initial={{ opacity: 0, y: 32, filter: "blur(14px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.36, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            La Piattaforma per Motociclisti
          </motion.h1>
          <motion.p
            className="mt-7 max-w-2xl text-lg leading-8 text-white/72 sm:text-xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.52, duration: 0.7 }}
          >
            Tessera digitale gratuita, convenzioni con partner selezionati, eventi e fratellanza su due ruote.
            Entra nella Squad e trasforma ogni weekend in una nuova rotta.
          </motion.p>

          <motion.div
            className="mt-9 flex flex-col gap-4 sm:flex-row"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.64, duration: 0.7 }}
          >
            <MagneticButton href="#iscrizione" className="min-h-14 px-8 text-base">
              Iscriviti GRATIS
            </MagneticButton>
            <MagneticButton href="#eventi" variant="secondary" className="min-h-14 px-8 text-base">
              Vedi eventi
            </MagneticButton>
          </motion.div>
        </div>

        <motion.div
          className="mt-10 grid gap-3 justify-self-stretch lg:mt-28 lg:max-w-md lg:justify-self-end"
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.74, duration: 0.75 }}
        >
          {[
            { icon: BadgeCheck, title: "Sponky Card", copy: "La tessera digitale che sblocca sconti e accessi." },
            { icon: MapPin, title: "Mappa viva", copy: "Partner, ritrovi e percorsi da scoprire vicino a te." },
            { icon: Zap, title: "Eventi reali", copy: "Motogiri, pista, serate e networking tra iscritti." },
          ].map((item) => (
            <div key={item.title} className="glass-panel rounded-lg p-4 bg-asphalt-950/50 backdrop-blur-md">
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-racing-orange text-asphalt-950">
                  <item.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-bold">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-white/62">{item.copy}</p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      <a
        href="#stats"
        className="absolute bottom-5 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2.5 text-xs font-bold uppercase text-white/58 backdrop-blur md:flex"
      >
        Scorri <ArrowDown className="h-3.5 w-3.5 animate-bounce" />
      </a>
    </section>
  );
}
