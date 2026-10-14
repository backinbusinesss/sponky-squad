import { ArrowRight } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { TiltCard } from "@/components/TiltCard";
import { steps } from "@/data/content";

export function HowItWorksSection() {
  return (
    <section id="come-funziona" className="section-shell overflow-hidden bg-asphalt-900">
      <div className="container">
        <SectionHeader
          eyebrow="Come funziona"
          title="Tre mosse. Zero attrito."
          copy="L'esperienza e' disegnata per portare il biker dalla curiosita' al valore reale: tessera, sconti, eventi e relazioni."
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {steps.map((step, index) => (
            <TiltCard key={step.title} className="relative min-h-80 p-7" glow="rgba(25,230,255,.18)">
              <div className="flex items-center justify-between">
                <span className="font-display text-7xl leading-none text-white/10">0{index + 1}</span>
                <span className="grid h-14 w-14 place-items-center rounded-full bg-white text-asphalt-950">
                  <step.icon className="h-6 w-6" />
                </span>
              </div>
              <h3 className="mt-14 font-display text-5xl uppercase leading-none text-white">{step.title}</h3>
              <p className="mt-5 text-base leading-7 text-white/64">{step.copy}</p>
              {index < steps.length - 1 ? (
                <ArrowRight className="absolute -right-4 top-1/2 hidden h-8 w-8 text-racing-orange lg:block" />
              ) : null}
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  );
}
