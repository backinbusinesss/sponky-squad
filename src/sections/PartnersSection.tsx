import { useEffect, useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/SectionHeader";
import { TiltCard } from "@/components/TiltCard";
import { partners as staticPartners } from "@/data/content";
import { api, type ContentPartner } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ViewPartner {
  key: string;
  title: string;
  location: string;
  description: string;
  tags: string[];
  imageUrl: string | null;
  tone: string | null;
}

function fromStatic(): ViewPartner[] {
  return staticPartners.map((partner) => ({
    key: partner.name,
    title: partner.name,
    location: partner.location,
    description: partner.offer,
    tags: [partner.category],
    imageUrl: null,
    tone: partner.tone,
  }));
}

function fromRemote(rows: ContentPartner[]): ViewPartner[] {
  return rows.map((row) => ({
    key: row.id,
    title: row.title,
    location: row.location,
    description: row.description,
    tags: row.tags,
    imageUrl: row.imageUrl,
    tone: null,
  }));
}

/**
 * Catalogo convenzioni.
 *
 * Le schede arrivano dall'API (le gestisce la dashboard: titolo, immagine,
 * descrizione, luogo e tag); se non ce ne sono si mostrano quelle di
 * `content.ts`. I tag delle schede caricate diventano i filtri in alto.
 */
export function PartnersSection() {
  const [remote, setRemote] = useState<ViewPartner[] | null>(null);
  const [active, setActive] = useState("Tutti");

  useEffect(() => {
    let alive = true;
    api
      .content()
      .then((data) => {
        if (alive) setRemote(fromRemote(data.partners));
      })
      .catch(() => {
        /* offline: resta il catalogo statico */
      });
    return () => {
      alive = false;
    };
  }, []);

  const list = useMemo(() => (remote && remote.length > 0 ? remote : fromStatic()), [remote]);

  // I filtri sono i tag presenti nel catalogo caricato, nell'ordine in cui
  // compaiono: cosi' non si mostrano tag che non hanno nessuna scheda.
  const categories = useMemo(() => {
    const tags = new Set<string>();
    list.forEach((partner) => partner.tags.forEach((tag) => tags.add(tag)));
    return ["Tutti", ...tags];
  }, [list]);

  useEffect(() => {
    if (!categories.includes(active)) setActive("Tutti");
  }, [categories, active]);

  const visiblePartners = useMemo(
    () => (active === "Tutti" ? list : list.filter((partner) => partner.tags.includes(active))),
    [list, active],
  );

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
            {categories.map((category) => (
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
            <TiltCard key={partner.key} className="overflow-hidden">
              {partner.imageUrl ? (
                <img
                  src={partner.imageUrl}
                  alt={partner.title}
                  loading="lazy"
                  className="h-32 w-full bg-white/5 object-cover"
                />
              ) : (
                <div className={cn("h-28 bg-gradient-to-br", partner.tone ?? "from-racing-orange/30 to-racing-cyan/10")} />
              )}
              <div className="p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <span className="rounded-full border border-white/12 px-3 py-1 text-xs font-bold uppercase text-white/56">
                    {partner.tags[0] ?? "Partner"}
                  </span>
                  <Search className="h-5 w-5 text-racing-cyan" />
                </div>
                <h3 className="text-xl font-extrabold text-white">{partner.title}</h3>
                {partner.location ? (
                  <p className="selectable mt-3 flex items-center gap-2 text-sm text-white/52">
                    <MapPin className="h-4 w-4 text-racing-orange" />
                    {partner.location}
                  </p>
                ) : null}
                <p className="mt-5 min-h-12 text-sm leading-6 text-white/68">{partner.description}</p>

                {partner.tags.length > 1 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {partner.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-racing-cyan/25 bg-racing-cyan/10 px-3 py-1 text-[0.7rem] font-bold uppercase text-racing-cyan"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

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
