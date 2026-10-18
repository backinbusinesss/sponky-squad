import { useMemo, useState } from "react";
import { Check, Images, RotateCcw, X } from "lucide-react";
import {
  EVENT_ART_LIBRARY,
  EVENT_ART_COUNT,
  MOOD_LABELS,
  MOOD_ORDER,
  MOOD_SWATCH,
  SCENE_OPTIONS,
  filterEventArt,
  type EventArtMood,
} from "@/data/eventArt";
import { cn } from "@/lib/utils";

interface EventArtPickerProps {
  value: string;
  onChange: (id: string) => void;
}

/**
 * Selettore della copertina evento.
 *
 * Mostra le 52 grafiche generate da `scripts/gen-event-art.mjs` e lascia
 * all'organizzatore la scelta della foto profilo: si filtra per palette o per
 * scena, poi si clicca la miniatura. Lo stato resta fuori, quindi cambiando
 * evento la selezione segue il dato.
 */
export function EventArtPicker({ value, onChange }: EventArtPickerProps) {
  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState<EventArtMood | null>(null);
  const [scene, setScene] = useState<number | null>(null);

  const list = useMemo(() => filterEventArt({ mood, scene }), [mood, scene]);
  const selected = EVENT_ART_LIBRARY.find((art) => art.id === value) ?? EVENT_ART_LIBRARY[0];
  const filtered = mood !== null || scene !== null;

  return (
    <div className="rounded-lg border border-white/10 bg-white/4 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <Images className="h-4 w-4 shrink-0 text-racing-cyan" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase text-white/42">Foto profilo evento</p>
          <p className="truncate text-sm font-bold text-white">
            {selected.sceneLabel} · {MOOD_LABELS[selected.mood]}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className="rounded-full border border-racing-cyan/40 bg-racing-cyan/10 px-4 py-2 text-xs font-bold uppercase text-racing-cyan transition hover:bg-racing-cyan/20"
        >
          {open ? (
            <span className="flex items-center gap-2">
              <X className="h-3.5 w-3.5" /> Chiudi
            </span>
          ) : (
            "Scegli grafica"
          )}
        </button>
      </div>

      {open && (
        <div className="mt-4 border-t border-white/10 pt-4">
          {/* filtri: palette e scena, indipendenti tra loro */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[0.68rem] font-bold uppercase text-white/38">Palette</span>
            <button
              type="button"
              onClick={() => setMood(null)}
              className={cn(
                "rounded-full border px-3 py-1 text-[0.68rem] font-bold uppercase transition",
                mood === null
                  ? "border-racing-orange bg-racing-orange/20 text-racing-orange"
                  : "border-white/12 text-white/52 hover:border-white/30",
              )}
            >
              Tutte
            </button>
            {MOOD_ORDER.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setMood(mood === key ? null : key)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1 text-[0.68rem] font-bold uppercase transition",
                  mood === key
                    ? "border-racing-orange bg-racing-orange/20 text-white"
                    : "border-white/12 text-white/52 hover:border-white/30",
                )}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: MOOD_SWATCH[key] }}
                  aria-hidden="true"
                />
                {MOOD_LABELS[key]}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[0.68rem] font-bold uppercase text-white/38">Scena</span>
            <button
              type="button"
              onClick={() => setScene(null)}
              className={cn(
                "rounded-full border px-3 py-1 text-[0.68rem] font-bold uppercase transition",
                scene === null
                  ? "border-racing-orange bg-racing-orange/20 text-racing-orange"
                  : "border-white/12 text-white/52 hover:border-white/30",
              )}
            >
              Tutte
            </button>
            {SCENE_OPTIONS.map((option) => (
              <button
                key={option.scene}
                type="button"
                onClick={() => setScene(scene === option.scene ? null : option.scene)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[0.68rem] font-bold uppercase transition",
                  scene === option.scene
                    ? "border-racing-orange bg-racing-orange/20 text-white"
                    : "border-white/12 text-white/52 hover:border-white/30",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <p className="mt-3 text-[0.68rem] font-bold uppercase text-white/34">
            {list.length} di {EVENT_ART_COUNT} grafiche
          </p>

          <div className="mt-3 grid max-h-72 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 lg:grid-cols-5">
            {list.map((art) => {
              const active = art.id === value;
              return (
                <button
                  key={art.id}
                  type="button"
                  onClick={() => onChange(art.id)}
                  aria-pressed={active}
                  title={`${art.sceneLabel} · ${MOOD_LABELS[art.mood]}`}
                  className={cn(
                    "group relative aspect-[16/10] overflow-hidden rounded-md border transition",
                    active
                      ? "border-racing-orange ring-2 ring-racing-orange/60"
                      : "border-white/10 hover:border-racing-cyan/60",
                  )}
                >
                  <img
                    src={art.url}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  {active && (
                    <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-racing-orange text-black">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {filtered && (
            <button
              type="button"
              onClick={() => {
                setMood(null);
                setScene(null);
              }}
              className="mt-3 flex items-center gap-2 text-[0.68rem] font-bold uppercase text-white/44 transition hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Azzera filtri
            </button>
          )}
        </div>
      )}
    </div>
  );
}
