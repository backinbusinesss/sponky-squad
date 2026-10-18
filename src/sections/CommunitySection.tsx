import { Play } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { communityShots, mapHighlights } from "@/data/content";
import { useIsCompact } from "@/hooks/useIsCompact";
import { asset } from "@/lib/asset";

export function CommunitySection() {
  const compact = useIsCompact();

  // unica didascalia: la si monta due volte ma solo quella visibile entra
  // nell'albero accessibile (l'altra e' display:none)
  const mapCaption = (
    <>
      <p className="text-sm font-bold uppercase text-racing-orange">Live map concept</p>
      <p className="mt-2 text-sm leading-6 text-white/62">
        Uno strato pronto per punti partner, ritrovi locali ed eventi in tempo reale.
      </p>
    </>
  );

  return (
    <section id="community" className="section-shell bg-asphalt-900">
      <div className="container">
        <div className="grid gap-10 lg:grid-cols-[.82fr_1.18fr] lg:items-end">
          <SectionHeader
            eyebrow="Community"
            title="Persone vere. Strade vere."
            copy="La gallery e' pensata per ospitare foto, reel e video-preview: al passaggio del mouse le card simulano un frame in movimento."
          />

          <div data-reveal className="relative w-full">
            <div className="relative aspect-[41/26] w-full overflow-hidden rounded-lg border border-white/12 bg-asphalt-950 p-5">
              <img src={asset("/assets/italy-map.svg")} alt="" className="absolute inset-0 h-full w-full object-cover" />
              {mapHighlights.map((spot) => (
                <span
                  key={spot.label}
                  className="selectable absolute rounded-full border border-racing-cyan/40 bg-racing-cyan/20 px-2 py-1 text-[10px] font-bold text-white shadow-neon sm:px-3 sm:text-xs"
                  style={{ left: compact ? spot.cx : spot.x, top: compact ? spot.cy : spot.y }}
                >
                  {spot.label}
                </span>
              ))}
              {/* Sotto i640px la mappa e' ~200px alta: la didascalia in
                  sovrimpressione finirebbe sopra i marker, quindi esce. */}
              <div className="absolute bottom-5 left-5 right-5 hidden sm:block">{mapCaption}</div>
            </div>
            <div className="mt-4 sm:hidden">{mapCaption}</div>
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {communityShots.map((shot) => (
            <article
              data-reveal
              key={shot.title}
              className="group relative aspect-[4/5] overflow-hidden rounded-lg border border-white/12 bg-white/6"
            >
              <img src={shot.src} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-asphalt-950 via-asphalt-950/18 to-transparent" />
              <span className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white text-asphalt-950 opacity-0 transition duration-300 group-hover:opacity-100">
                <Play className="h-5 w-5 fill-current" />
              </span>
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="text-xs font-extrabold uppercase text-racing-cyan">{shot.label}</p>
                <h3 className="mt-2 font-display text-4xl uppercase leading-none text-white">{shot.title}</h3>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
