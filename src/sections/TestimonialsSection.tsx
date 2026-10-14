import { useEffect, useState } from "react";
import { Quote, Star } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { testimonials } from "@/data/content";

export function TestimonialsSection() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIndex((value) => (value + 1) % testimonials.length);
    }, 5200);

    return () => window.clearInterval(interval);
  }, []);

  const active = testimonials[index];

  return (
    <section className="section-shell overflow-hidden bg-asphalt-950">
      <div className="container">
        <div data-reveal className="mx-auto max-w-5xl text-center">
          <p className="text-sm font-extrabold uppercase tracking-normal text-racing-orange">Testimonianze</p>
          <h2 className="mt-4 font-display text-5xl uppercase leading-none text-white sm:text-7xl">
            Cosa dice la Squad
          </h2>
        </div>

        <div data-reveal className="relative mx-auto mt-12 max-w-4xl rounded-lg border border-white/12 bg-white/6 p-8 shadow-card md:p-12">
          <Quote className="absolute left-6 top-6 h-14 w-14 text-racing-orange/20" />
          <AnimatePresence mode="wait">
            <motion.div
              key={active.author}
              initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -18, filter: "blur(8px)" }}
              transition={{ duration: 0.45 }}
              className="relative"
            >
              <div className="mb-8 flex justify-center gap-1 text-racing-orange">
                {Array.from({ length: 5 }).map((_, star) => (
                  <Star key={star} className="h-5 w-5 fill-current" />
                ))}
              </div>
              <p className="text-center text-2xl font-semibold leading-10 text-white md:text-3xl">"{active.quote}"</p>
              <div className="mt-9 text-center">
                <p className="font-extrabold text-white">{active.author}</p>
                <p className="mt-1 text-sm text-white/48">{active.bike}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-10 flex justify-center gap-2">
            {testimonials.map((item, itemIndex) => (
              <button
                key={item.author}
                type="button"
                aria-label={`Mostra testimonianza ${itemIndex + 1}`}
                onClick={() => setIndex(itemIndex)}
                className={`h-2.5 rounded-full transition ${itemIndex === index ? "w-10 bg-racing-orange" : "w-2.5 bg-white/24"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
