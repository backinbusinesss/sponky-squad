import { AnimatedCounter } from "@/components/AnimatedCounter";
import { stats } from "@/data/content";

export function StatsLiveSection() {
  return (
    <section id="stats" className="section-shell bg-asphalt-950">
      <div className="container">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div data-reveal>
            <p className="text-sm font-extrabold uppercase tracking-normal text-racing-cyan">Stats live</p>
            <h2 className="mt-3 font-display text-5xl uppercase leading-none text-white sm:text-7xl">
              La Squad accelera
            </h2>
          </div>
          <p data-reveal className="max-w-xl text-base leading-7 text-white/62">
            Numeri pensati per essere collegati a dashboard, CRM o API live. Per ora raccontano la trazione attuale
            della community e il modello free signup.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <div key={item.label} data-reveal className="glass-panel rounded-lg p-6">
              <item.icon className="mb-8 h-8 w-8 text-racing-orange" />
              <p className="font-display text-6xl leading-none text-white">
                <AnimatedCounter value={item.value} suffix={item.suffix} />
              </p>
              <p className="mt-3 text-sm font-bold uppercase tracking-normal text-white/48">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
