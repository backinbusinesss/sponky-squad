import { useMemo, useState } from "react";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { EventArtPicker } from "@/components/EventArtPicker";
import { events } from "@/data/content";
import { getEventArt } from "@/data/eventArt";
import { useCountdown } from "@/hooks/useCountdown";
import { cn } from "@/lib/utils";

function Countdown({ date }: { date: string }) {
  const countdown = useCountdown(date);
  const items = [
    ["Giorni", countdown.days],
    ["Ore", countdown.hours],
    ["Min", countdown.minutes],
    ["Sec", countdown.seconds],
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-white/12 bg-white/8 p-3 text-center">
          <p className="font-display text-4xl leading-none text-white">{String(value).padStart(2, "0")}</p>
          <p className="mt-1 text-[0.7rem] font-bold uppercase text-white/42">{label}</p>
        </div>
      ))}
    </div>
  );
}

export function EventsSection() {
  const [selectedTitle, setSelectedTitle] = useState(events[0].title);
  const selected = useMemo(() => events.find((event) => event.title === selectedTitle) ?? events[0], [selectedTitle]);

  // Copertina scelta per ogni evento: parte dal dato in content.ts e resta in
  // stato locale, cosi' l'organizzatore puo' provare le grafiche in pagina.
  const [covers, setCovers] = useState<Record<string, string>>(() =>
    Object.fromEntries(events.map((event) => [event.title, event.cover])),
  );
  const cover = getEventArt(covers[selected.title] ?? selected.cover);

  const formattedDate = new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(selected.date));

  return (
    <section id="eventi" className="section-shell overflow-hidden bg-asphalt-950">
      <div className="container">
        <SectionHeader
          eyebrow="Eventi"
          title="Il calendario che chiama la strada"
          copy="Un modulo interattivo per prossimi raduni, track day e serate partner con countdown live e scheda evento."
          align="center"
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-[.95fr_1.05fr]">
          <div data-reveal className="glass-panel rounded-lg p-4 lg:self-start">
            <div className="mb-4 flex items-center gap-3 px-2 text-sm font-bold uppercase text-white/42">
              <CalendarDays className="h-4 w-4 text-racing-orange" />
              Prossime uscite
            </div>
            <div className="grid gap-3">
              {events.map((event) => (
                <button
                  key={event.title}
                  type="button"
                  onClick={() => setSelectedTitle(event.title)}
                  className={cn(
                    "rounded-lg border p-5 text-left transition",
                    event.title === selected.title
                      ? "border-racing-orange bg-racing-orange/12"
                      : "border-white/10 bg-white/5 hover:border-racing-cyan/50 hover:bg-white/8",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-extrabold text-white">{event.title}</h3>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase text-racing-cyan">
                      {event.tag}
                    </span>
                  </div>
                  <p className="mt-3 flex items-center gap-2 text-sm text-white/56">
                    <Clock className="h-4 w-4" />
                    {new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(event.date))}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div data-reveal className="relative overflow-hidden rounded-lg border border-white/12 bg-white/6 p-6 shadow-card">
            <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-racing-cyan/18 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-racing-orange/20 blur-3xl" />
            <div className="relative">
              {/* copertina scelta dall'organizzatore: e' la foto profilo evento */}
              <div className="relative mb-6 overflow-hidden rounded-lg border border-white/12">
                <img
                  key={cover.id}
                  src={cover.url}
                  alt={`Copertina evento: ${cover.sceneLabel}`}
                  className="aspect-[16/9] w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-asphalt-950 via-asphalt-950/30 to-transparent" />
                <span className="absolute left-3 top-3 rounded-full border border-racing-cyan/35 bg-asphalt-950/70 px-3 py-1 text-xs font-bold uppercase text-racing-cyan backdrop-blur">
                  Evento selezionato
                </span>
              </div>
              <h3 className="font-display text-6xl uppercase leading-none text-white">{selected.title}</h3>
              <p className="selectable mt-4 flex items-center gap-2 text-white/62">
                <MapPin className="h-4 w-4 text-racing-orange" />
                {selected.place}
              </p>
              <p className="mt-2 text-white/62">{formattedDate}</p>
              <p className="mt-6 text-base leading-8 text-white/68">{selected.description}</p>
              <div className="mt-8">
                <Countdown date={selected.date} />
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Button asChild>
                  <a href="#iscrizione">Prenota posto</a>
                </Button>
                <p className="text-sm font-bold uppercase text-white/44">{selected.seats} posti community</p>
              </div>

              <div className="mt-6">
                <EventArtPicker
                  value={cover.id}
                  onChange={(id) => setCovers((prev) => ({ ...prev, [selected.title]: id }))}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
