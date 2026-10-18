import { BadgeCheck, QrCode } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { asset } from "@/lib/asset";

export function DigitalCardSection() {
  return (
    <section id="tessera" className="section-shell overflow-hidden bg-asphalt-950">
      <div className="container grid items-center gap-14 lg:grid-cols-[.9fr_1.1fr]">
        <SectionHeader
          eyebrow="Tessera digitale"
          title="La card che viaggia con te"
          copy="Una tessera virtuale pronta per convenzioni, check-in eventi e benefit partner. Il flip mostra fronte e retro come base per una futura area utente personalizzata."
        />

        <div data-reveal className="group perspective-1200 mx-auto w-full max-w-xl">
          <div className="card-flip preserve-3d relative aspect-[1.58/1] w-full rounded-[1.6rem] transition duration-700">
            <div className="backface-hidden absolute inset-0 rounded-[1.6rem] border border-white/16 bg-[radial-gradient(circle_at_20%_10%,rgba(25,230,255,.35),transparent_30%),linear-gradient(135deg,rgba(255,122,24,.92),rgba(255,47,47,.78)_42%,rgba(15,19,30,.96))] p-7 shadow-neon">
              <div className="flex h-full flex-col justify-between">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-normal text-asphalt-950/72">Sponky Card</p>
                    <p className="font-display text-5xl uppercase leading-none text-white">Digital pass</p>
                  </div>
                  <img src={asset("/assets/sponky-logo-original.webp")} alt="" className="h-14 w-14 rounded-full bg-white/85 object-contain p-2" />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-normal text-white/68">Rider</p>
                  <p className="mt-1 font-display text-4xl uppercase leading-none text-white">Nome Cognome</p>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs uppercase text-white/55">Member ID</p>
                    <p className="font-mono text-sm text-white">SS-2026-3500</p>
                  </div>
                  <BadgeCheck className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>

            <div className="backface-hidden absolute inset-0 rotate-y-180 rounded-[1.6rem] border border-white/20 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,.12),transparent_28%),linear-gradient(135deg,#080808,#1d1d1b)] p-7 shadow-neon">
              <div className="flex h-full flex-col justify-between">
                <div className="flex justify-between gap-5">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-normal text-racing-cyan">Validazione partner</p>
                    <p className="mt-3 max-w-xs text-sm leading-6 text-white/64">
                      Mostra il codice o usa il numero tessera per sbloccare la convenzione.
                    </p>
                  </div>
                  <div className="grid h-28 w-28 place-items-center rounded-xl bg-white text-asphalt-950">
                    <QrCode className="h-20 w-20" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {["Free", "Partner", "Eventi"].map((item) => (
                    <span key={item} className="rounded-full border border-white/12 px-3 py-2 text-center text-xs font-bold uppercase text-white/72">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <p className="mt-5 text-center text-sm text-white/48">Passa sopra la card per vedere il retro.</p>
        </div>
      </div>
    </section>
  );
}
