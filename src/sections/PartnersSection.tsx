import { useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/SectionHeader";
import { TiltCard } from "@/components/TiltCard";
import { partnerCategories, partners } from "@/data/content";
import { cn } from "@/lib/utils";

export function PartnersSection() {
  const [active, setActive] = useState("Tutti");

  const visiblePartners = useMemo(() => {
    if (active === "Tutti") {
      return partners;
    }

    return partners.filter((partner) => partner.category === active);
  }, [active]);

  return (
    <section id="partner" className="section-shell bg-asphalt-900">
      <div className="container">
        <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-end">
          <SectionHeader
            eyebrow="Convenzioni / partner"
            title="Sconti che fanno benzina"
            copy="Una griglia filtrabile pronta per collegarsi al catalogo partner reale: ogni card evidenzia categoria, localita' e beneficio."
          />
          <div data-reveal className="flex flex-wrap gap-2 lg:justify-end">
            {partnerCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActive(category)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-bold transition",
                  active === category
                    ? "border-racing-orange bg-racing-orange text-asphalt-950"
                    : "border-white/12 bg-white/6 text-white/62 hover:border-racing-cyan/60 hover:text-white",
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 card-grid">
          {visiblePartners.map((partner) => (
            <TiltCard key={partner.name} className="overflow-hidden">
              <div className={cn("h-28 bg-gradient-to-br", partner.tone)} />
              <div className="p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <span className="rounded-full border border-white/12 px-3 py-1 text-xs font-bold uppercase text-white/56">
                    {partner.category}
                  </span>
                  <Search className="h-5 w-5 text-racing-cyan" />
                </div>
                <h3 className="text-xl font-extrabold text-white">{partner.name}</h3>
                <p className="selectable mt-3 flex items-center gap-2 text-sm text-white/52">
                  <MapPin className="h-4 w-4 text-racing-orange" />
                  {partner.location}
                </p>
                <p className="mt-5 min-h-12 text-sm leading-6 text-white/68">{partner.offer}</p>
                <Button variant="secondary" size="sm" className="mt-6 w-full">
                  Scopri la promo
                </Button>
              </div>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  );
}
