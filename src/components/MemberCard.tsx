import { asset } from "@/lib/asset";
import type { MemberCard as CardData } from "@/lib/api";

/**
 * Member Card grafica mostrata nella sezione "La mia tessera" di /account.
 *
 * Riprende l'identita' visiva del sito (asphalt scuro, arancio racing, bordi
 * arrotondati, glow) ereditando le classi Tailwind gia' presenti. Il maialino
 * e' il logo ufficiale; il numero tessera e il codice membro sono i due campi
 * che rendono la tessera personale.
 */
export function MemberCard({ card }: { card: CardData }) {
  const styles = card.ridingStyles ?? [];
  const initials = card.holderName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <article className="relative overflow-hidden rounded-2xl border border-racing-orange/30 bg-gradient-to-br from-asphalt-900 via-asphalt-950 to-black p-6 shadow-[0_0_60px_rgba(255,110,26,.14)]">
      {/* alone arancio in alto a destra */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-racing-orange/20 blur-3xl"
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src={asset("/assets/sponky-logo-original.webp")}
            alt="Sponky Squad"
            className="h-12 w-12 object-contain drop-shadow-[0_0_12px_rgba(255,110,26,.5)]"
          />
          <div>
            <p className="font-display text-xl leading-none text-white">Sponky Squad</p>
            <p className="text-xs font-bold uppercase tracking-wider text-racing-orange">Tessera ufficiale</p>
          </div>
        </div>

        <span className="grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-white/10 font-display text-lg text-white">
          {initials || "?"}
        </span>
      </div>

      <div className="relative mt-6">
        <p className="text-xs uppercase tracking-wider text-white/45">Titolare</p>
        <p className="font-display text-2xl text-white">{card.holderName}</p>
      </div>

      <dl className="relative mt-5 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs uppercase tracking-wider text-white/45">Numero tessera</dt>
          <dd className="font-display text-3xl text-racing-orange">N° {card.cardNumber ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-white/45">Gruppo</dt>
          <dd className="text-sm font-bold text-white">{card.group || "Nessun gruppo"}</dd>
        </div>
      </dl>

      <div className="relative mt-5">
        <p className="text-xs uppercase tracking-wider text-white/45">ID univoco</p>
        <p className="font-mono text-lg tracking-widest text-white">{card.memberId}</p>
      </div>

      {styles.length > 0 ? (
        <div className="relative mt-5 flex flex-wrap gap-2">
          {styles.map((value) => (
            <span
              key={value}
              className="rounded-full border border-racing-cyan/40 bg-racing-cyan/10 px-3 py-1 text-xs font-bold text-racing-cyan"
            >
              {value}
            </span>
          ))}
        </div>
      ) : null}

      <div className="relative mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-white/40">
        <span>sponkysquad.it</span>
        {card.issuedAt ? (
          <span>Rilasciata il {new Date(card.issuedAt).toLocaleDateString("it-IT")}</span>
        ) : null}
      </div>
    </article>
  );
}
