import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { asset } from "@/lib/asset";

export function Preloader() {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const progressTimer = window.setInterval(() => {
      setProgress((value) => Math.min(value + Math.random() * 24, 100));
    }, 170);

    const done = window.setTimeout(() => {
      setProgress(100);
      setVisible(false);
    }, 1550);

    return () => {
      window.clearInterval(progressTimer);
      window.clearTimeout(done);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="fixed inset-0 z-[90] grid place-items-center bg-asphalt-950"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="absolute inset-0 bg-radial-neon opacity-80" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-road-lines opacity-20 blur-[1px]" />
          <div className="relative flex w-full max-w-xl flex-col items-center px-6 text-center">
            <motion.div
              className="preserve-3d relative mb-8 grid h-28 w-28 place-items-center rounded-full border border-white/15 bg-white/8 shadow-neon"
              initial={{ rotateX: -38, rotateY: -34, opacity: 0 }}
              animate={{ rotateX: 0, rotateY: 0, opacity: 1 }}
              transition={{ duration: 0.85, ease: "easeOut" }}
            >
              <motion.img
                src={asset("/assets/sponky-logo-original.webp")}
                alt=""
                className="h-16 w-16 object-contain"
                initial={{ scale: 0.72, filter: "blur(10px)" }}
                animate={{ scale: 1, filter: "blur(0px)" }}
                transition={{ delay: 0.2, duration: 0.8 }}
              />
              <span className="absolute inset-2 rounded-full border border-racing-orange/35" />
            </motion.div>
            <motion.p
              className="font-display text-5xl uppercase leading-none text-white neon-text sm:text-7xl"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26, duration: 0.7 }}
            >
              Sponky Squad
            </motion.p>
            <div className="mt-8 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-racing-orange via-racing-red to-racing-cyan"
                animate={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-xs font-bold uppercase tracking-normal text-white/50">
              Caricamento esperienza {Math.round(progress)}%
            </p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
